import { useState, useRef, useEffect, useMemo } from 'react';
import {
  CAMPUS_LOCATIONS,
  CAMERA_ANCHORS,
  RESOURCE_STATIONS,
  ROAD_PATHS,
  CAMPUS_VIEWBOX,
} from '../utils/campusData';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Video,
  Truck,
  AlertTriangle,
  Shield,
  RotateCcw,
  Compass,
  Crosshair,
} from 'lucide-react';

// Helper to compute directional camera FOV cone
function getCameraFovPath(x, y, angleDeg, fovDeg, reach) {
  const startAngle = (angleDeg - fovDeg / 2) * (Math.PI / 180);
  const endAngle = (angleDeg + fovDeg / 2) * (Math.PI / 180);
  const x1 = x + reach * Math.cos(startAngle);
  const y1 = y + reach * Math.sin(startAngle);
  const x2 = x + reach * Math.cos(endAngle);
  const y2 = y + reach * Math.sin(endAngle);
  return `M ${x} ${y} L ${x1} ${y1} A ${reach} ${reach} 0 0 1 ${x2} ${y2} Z`;
}

// Priority color resolver
const PRIORITY_COLORS = {
  P0: { stroke: '#DC2626', fill: 'rgba(220, 38, 38, 0.22)', text: '#EF4444', label: 'CRITICAL P0' },
  P1: { stroke: '#EA580C', fill: 'rgba(234, 88, 12, 0.22)', text: '#F97316', label: 'SERIOUS P1' },
  P2: { stroke: '#D97706', fill: 'rgba(217, 119, 6, 0.20)', text: '#F59E0B', label: 'SIGNIFICANT P2' },
  P3: { stroke: '#2563EB', fill: 'rgba(37, 99, 235, 0.18)', text: '#3B82F6', label: 'URGENCY P3' },
};

export default function CampusTacticalMap({
  incidents = [],
  cameras = [],
  resources = [],
  separationTasks = [],
  selectedIncidentId = null,
  focusedLocation = null,
  onSelectLocation = null,
  onSelectIncident = null,
  onSelectCamera = null,
  compactMode = false,
  customHeight = '100%',
}) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ scale: 1, panX: 0, panY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [hoveredCamera, setHoveredCamera] = useState(null);

  // Layer toggles
  const [layers, setLayers] = useState({
    incidents: true,
    cameras: true,
    resources: true,
    cordons: true,
    zones: true,
  });

  // Focus on a specific location if passed
  useEffect(() => {
    if (focusedLocation && CAMPUS_LOCATIONS[focusedLocation]) {
      const loc = CAMPUS_LOCATIONS[focusedLocation];
      const targetScale = compactMode ? 1.4 : 1.7;
      const panX = (CAMPUS_VIEWBOX.width / 2 - loc.center.x) * targetScale;
      const panY = (CAMPUS_VIEWBOX.height / 2 - loc.center.y) * targetScale;
      setTransform({ scale: targetScale, panX, panY });
    }
  }, [focusedLocation, compactMode]);

  // Group active incidents by location
  const incidentsByLocation = useMemo(() => {
    const map = {};
    incidents.forEach((inc) => {
      if (!map[inc.location]) map[inc.location] = [];
      map[inc.location].push(inc);
    });
    return map;
  }, [incidents]);

  // Separation tasks by location
  const cordonedLocations = useMemo(() => {
    const set = new Set();
    separationTasks.forEach((t) => {
      if (t.status !== 'COMPLETED' && t.target_location) {
        // Find which campus location matches the target
        Object.keys(CAMPUS_LOCATIONS).forEach((locKey) => {
          if (
            t.target_location.toLowerCase().includes(locKey.toLowerCase()) ||
            CAMPUS_LOCATIONS[locKey].name.toLowerCase().includes(t.target_location.toLowerCase())
          ) {
            set.add(locKey);
          }
        });
      }
    });
    // Also cordon any location with a P0 or P1 active incident
    incidents.forEach((inc) => {
      if (['P0', 'P1'].includes(inc.priority) && inc.status !== 'RESOLVED' && inc.status !== 'CLOSED') {
        set.add(inc.location);
      }
    });
    return set;
  }, [separationTasks, incidents]);

  // Mouse pan & zoom handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.panX, y: e.clientY - transform.panY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      panX: e.clientX - dragStart.x,
      panY: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.7), 3.2);
      return { ...prev, scale: newScale };
    });
  };

  const resetView = () => {
    setTransform({ scale: 1, panX: 0, panY: 0 });
  };

  const zoomIn = () => {
    setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.25, 3.2) }));
  };

  const zoomOut = () => {
    setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.7) }));
  };

  return (
    <div
      className="tactical-map-container"
      style={{
        position: 'relative',
        width: '100%',
        height: customHeight,
        background: '#121417',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        userSelect: 'none',
      }}
    >
      {/* Tactical HUD Header Controls */}
      <div className="tactical-hud-bar">
        <div className="hud-brand">
          <Crosshair size={14} className="hud-icon-gold" />
          <span className="hud-title">CAMPUS TACTICAL DIGITAL TWIN</span>
          <span className="hud-live-tag">LIVE GRID</span>
        </div>

        {!compactMode && (
          <div className="hud-layers">
            <button
              className={`hud-toggle-btn ${layers.incidents ? 'active' : ''}`}
              onClick={() => setLayers((l) => ({ ...l, incidents: !l.incidents }))}
              title="Toggle Incidents & Hazard Beacons"
            >
              <AlertTriangle size={12} />
              Incidents ({incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length})
            </button>

            <button
              className={`hud-toggle-btn ${layers.cameras ? 'active' : ''}`}
              onClick={() => setLayers((l) => ({ ...l, cameras: !l.cameras }))}
              title="Toggle CCTV Coverage & Vision Cones"
            >
              <Video size={12} />
              CCTV ({Object.keys(CAMERA_ANCHORS).length})
            </button>

            <button
              className={`hud-toggle-btn ${layers.resources ? 'active' : ''}`}
              onClick={() => setLayers((l) => ({ ...l, resources: !l.resources }))}
              title="Toggle Deployed Emergency Units"
            >
              <Truck size={12} />
              Units ({resources.length || 7})
            </button>

            <button
              className={`hud-toggle-btn ${layers.cordons ? 'active' : ''}`}
              onClick={() => setLayers((l) => ({ ...l, cordons: !l.cordons }))}
              title="Toggle Perimeter Cordons"
            >
              <Shield size={12} />
              Cordons ({cordonedLocations.size})
            </button>
          </div>
        )}

        <div className="hud-actions">
          <button className="hud-action-btn" onClick={zoomIn} title="Zoom In">
            <ZoomIn size={13} />
          </button>
          <button className="hud-action-btn" onClick={zoomOut} title="Zoom Out">
            <ZoomOut size={13} />
          </button>
          <button className="hud-action-btn" onClick={resetView} title="Reset View">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CAMPUS_VIEWBOX.width} ${CAMPUS_VIEWBOX.height}`}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'block',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* Tactical blueprint grid */}
          <pattern id="tac-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1" fill="rgba(212,175,55,0.3)" />
          </pattern>

          {/* Sub-grid dot markers */}
          <pattern id="tac-dots" width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="60" cy="60" r="1.5" fill="rgba(212,175,55,0.2)" />
            <path d="M 50 60 L 70 60 M 60 50 L 60 70" stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" />
          </pattern>

          {/* Caution stripe pattern for cordon zones */}
          <pattern id="cordon-stripes" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(220, 38, 38, 0.35)" strokeWidth="6" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="6" />
          </pattern>

          {/* Camera vision cone gradient */}
          <radialGradient id="cctv-cone-glow" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
            <stop offset="70%" stopColor="rgba(56, 189, 248, 0.12)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0.0)" />
          </radialGradient>

          {/* Incident pulse filters */}
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Scaled & Panned Scene Group */}
        <g
          transform={`translate(${transform.panX}, ${transform.panY}) scale(${transform.scale})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}
        >
          {/* Base Tactical Grid */}
          <rect x="0" y="0" width={CAMPUS_VIEWBOX.width} height={CAMPUS_VIEWBOX.height} fill="#101317" />
          <rect x="0" y="0" width={CAMPUS_VIEWBOX.width} height={CAMPUS_VIEWBOX.height} fill="url(#tac-grid)" />
          <rect x="0" y="0" width={CAMPUS_VIEWBOX.width} height={CAMPUS_VIEWBOX.height} fill="url(#tac-dots)" />

          {/* Campus Boundary Fence & Coordinates */}
          <rect
            x="40"
            y="40"
            width={CAMPUS_VIEWBOX.width - 80}
            height={CAMPUS_VIEWBOX.height - 80}
            fill="none"
            stroke="rgba(212, 175, 55, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="8 6"
          />
          <text x="50" y="60" fill="rgba(212, 175, 55, 0.6)" fontSize="10" fontFamily="JetBrains Mono, monospace">
            CAMPUS PERIMETER BOUNDARY [GRID SEC-4A]
          </text>
          <text x="1000" y="60" fill="rgba(255, 255, 255, 0.3)" fontSize="9" fontFamily="JetBrains Mono, monospace">
            LAT: 12.9716° N / LON: 77.5946° E
          </text>

          {/* Campus Ring Roads & Emergency Corridors */}
          <g className="road-network">
            {ROAD_PATHS.map((pathStr, i) => (
              <g key={`road-${i}`}>
                {/* Road bed */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Road surface */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="#1c2128"
                  strokeWidth="24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dashed Centerline */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="rgba(212, 175, 55, 0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="6 8"
                />
              </g>
            ))}
          </g>

          {/* Central Admin Plaza & Assembly Circle */}
          <circle cx="585" cy="430" r="115" fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="2" strokeDasharray="4 6" />
          <circle cx="585" cy="430" r="45" fill="rgba(212,175,55,0.06)" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
          <text x="585" y="434" textAnchor="middle" fill="rgba(212, 175, 55, 0.7)" fontSize="9" fontFamily="JetBrains Mono, monospace">
            CENTRAL PLAZA
          </text>

          {/* Sports Ground Oval & Running Track */}
          <g className="sports-ground-features">
            <rect x="970" y="250" width="160" height="160" rx="45" fill="rgba(16, 185, 129, 0.07)" stroke="#10B981" strokeWidth="1.5" />
            <rect x="985" y="265" width="130" height="130" rx="35" fill="none" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="1050" y="325" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600" fontFamily="Outfit, sans-serif">
              SPORTS ARENA
            </text>
            <text x="1050" y="342" textAnchor="middle" fill="rgba(16, 185, 129, 0.8)" fontSize="9" fontFamily="JetBrains Mono, monospace">
              PRIMARY EVACUATION ZONE
            </text>
          </g>

          {/* Electrical Substation Hazard Yard */}
          <g className="substation-features">
            <rect x="975" y="95" width="130" height="100" fill="rgba(234, 179, 8, 0.06)" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="5 3" />
            <line x1="975" y1="95" x2="1105" y2="195" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
            <line x1="1105" y1="95" x2="975" y2="195" stroke="rgba(234, 179, 8, 0.2)" strokeWidth="1" />
          </g>

          {/* =======================================================
              14 CAMPUS BUILDINGS (Footprints & Interactive Zones)
             ======================================================= */}
          {Object.entries(CAMPUS_LOCATIONS).map(([key, loc]) => {
            if (key === 'OTHER') return null;
            const activeIncs = incidentsByLocation[key] || [];
            const hasActiveIncidents = activeIncs.some((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
            const isCordoned = cordonedLocations.has(key);
            const isHovered = hoveredBuilding === key;
            const isFocused = focusedLocation === key;
            const worstPriority = activeIncs.reduce((highest, inc) => {
              const ranks = { P0: 4, P1: 3, P2: 2, P3: 1 };
              return ranks[inc.priority] > ranks[highest] ? inc.priority : highest;
            }, 'P3');
            const pStyle = PRIORITY_COLORS[worstPriority] || PRIORITY_COLORS.P3;

            return (
              <g
                key={key}
                className="campus-building-group"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectLocation && onSelectLocation(loc, activeIncs)}
                onMouseEnter={() => setHoveredBuilding(key)}
                onMouseLeave={() => setHoveredBuilding(null)}
              >
                {/* Active Cordon Perimeter Halo */}
                {layers.cordons && isCordoned && (
                  <g className="cordon-layer">
                    <rect
                      x={loc.x - 22}
                      y={loc.y - 22}
                      width={loc.w + 44}
                      height={loc.h + 44}
                      rx="6"
                      fill="url(#cordon-stripes)"
                      stroke="#DC2626"
                      strokeWidth="2"
                      strokeDasharray="8 6"
                      className="cordon-pulse"
                    />
                    <text
                      x={loc.center.x}
                      y={loc.y - 27}
                      textAnchor="middle"
                      fill="#EF4444"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                      letterSpacing="1"
                    >
                      ⚠ ACTIVE PERIMETER CORDON
                    </text>
                  </g>
                )}

                {/* Building Base Shadow */}
                <rect
                  x={loc.x + 4}
                  y={loc.y + 4}
                  width={loc.w}
                  height={loc.h}
                  fill="#0c0e12"
                  rx="3"
                />

                {/* Building Body */}
                <rect
                  x={loc.x}
                  y={loc.y}
                  width={loc.w}
                  height={loc.h}
                  rx="2"
                  fill={
                    hasActiveIncidents && layers.incidents
                      ? pStyle.fill
                      : isHovered || isFocused
                      ? '#242a33'
                      : '#181d24'
                  }
                  stroke={
                    hasActiveIncidents && layers.incidents
                      ? pStyle.stroke
                      : isHovered || isFocused
                      ? 'var(--gold)'
                      : 'rgba(255, 255, 255, 0.16)'
                  }
                  strokeWidth={hasActiveIncidents ? '2.5' : isHovered || isFocused ? '2' : '1.2'}
                  filter={hasActiveIncidents ? 'url(#glow-red)' : undefined}
                />

                {/* Architectural Blueprint Inner Detail Lines */}
                <rect
                  x={loc.x + 8}
                  y={loc.y + 8}
                  width={loc.w - 16}
                  height={loc.h - 16}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="0.8"
                />

                {/* Building Entry Doorway Portals */}
                <rect
                  x={loc.center.x - 14}
                  y={loc.y + loc.h - 3}
                  width="28"
                  height="4"
                  fill="#D4AF37"
                />

                {/* Building Name & Subtitle Labels */}
                {layers.zones && (
                  <g className="building-labels" pointerEvents="none">
                    <text
                      x={loc.center.x}
                      y={loc.center.y - 10}
                      textAnchor="middle"
                      fill={hasActiveIncidents ? '#FFFFFF' : '#E2E8F0'}
                      fontSize="13"
                      fontWeight="700"
                      fontFamily="Outfit, sans-serif"
                      letterSpacing="-0.01em"
                    >
                      {loc.name}
                    </text>
                    <text
                      x={loc.center.x}
                      y={loc.center.y + 7}
                      textAnchor="middle"
                      fill={hasActiveIncidents ? 'rgba(255,255,255,0.85)' : 'rgba(255, 255, 255, 0.55)'}
                      fontSize="9.5"
                      fontFamily="Inter, sans-serif"
                    >
                      {loc.subtitle}
                    </text>
                    <text
                      x={loc.center.x}
                      y={loc.center.y + 22}
                      textAnchor="middle"
                      fill="rgba(212, 175, 55, 0.75)"
                      fontSize="8"
                      fontFamily="JetBrains Mono, monospace"
                      letterSpacing="0.5"
                    >
                      OCC: {loc.occupancy}
                    </text>
                  </g>
                )}

                {/* Active Incident Warning Beacon */}
                {layers.incidents && hasActiveIncidents && (
                  <g className="incident-beacon-indicator" transform={`translate(${loc.center.x}, ${loc.y + 20})`}>
                    <circle r="18" fill="none" stroke={pStyle.stroke} strokeWidth="1.5" className="radar-ping" />
                    <circle r="10" fill={pStyle.stroke} filter="url(#glow-red)" />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      !
                    </text>
                    {/* Badge */}
                    <g transform="translate(0, -22)">
                      <rect x="-35" y="-12" width="70" height="15" rx="3" fill="#DC2626" />
                      <text x="0" y="-1" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
                        {pStyle.label}
                      </text>
                    </g>
                  </g>
                )}
              </g>
            );
          })}

          {/* =======================================================
              CCTV CAMERAS LAYER (Anchors & Directional FOV Cones)
             ======================================================= */}
          {layers.cameras && (
            <g className="cctv-cameras-layer">
              {Object.entries(CAMERA_ANCHORS).map(([camName, cam]) => {
                const isCamHovered = hoveredCamera === camName;
                const fovPath = getCameraFovPath(cam.x, cam.y, cam.angle, cam.fov, cam.reach);

                return (
                  <g
                    key={camName}
                    className="cctv-unit-group"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCamera && onSelectCamera(camName, cam);
                    }}
                    onMouseEnter={() => setHoveredCamera(camName)}
                    onMouseLeave={() => setHoveredCamera(null)}
                  >
                    {/* Directional Vision FOV Cone */}
                    <path
                      d={fovPath}
                      fill="url(#cctv-cone-glow)"
                      stroke="rgba(56, 189, 248, 0.4)"
                      strokeWidth="0.8"
                      strokeDasharray="2 3"
                    />

                    {/* Camera Anchor Pin */}
                    <circle
                      cx={cam.x}
                      cy={cam.y}
                      r={isCamHovered ? '7' : '5'}
                      fill="#0284C7"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                    />
                    <circle cx={cam.x} cy={cam.y} r="2" fill="#FFFFFF" />

                    {/* Camera Label */}
                    <text
                      x={cam.x}
                      y={cam.y - 9}
                      textAnchor="middle"
                      fill={isCamHovered ? '#38BDF8' : 'rgba(255,255,255,0.7)'}
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {camName}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* =======================================================
              RESPONSE UNITS & DISPATCH VECTORS LAYER
             ======================================================= */}
          {layers.resources && (
            <g className="response-units-layer">
              {/* Draw dispatch lines from home stations to active incident sites */}
              {incidents
                .filter((inc) => ['DISPATCHED', 'RESPONDING', 'ON_SCENE'].includes(inc.status))
                .map((inc) => {
                  const targetLoc = CAMPUS_LOCATIONS[inc.location];
                  if (!targetLoc) return null;
                  const homeStation = RESOURCE_STATIONS.SECURITY_ROOM; // default hub
                  return (
                    <g key={`vector-${inc.id}`}>
                      <line
                        x1={homeStation.x}
                        y1={homeStation.y}
                        x2={targetLoc.center.x}
                        y2={targetLoc.center.y}
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        className="dispatch-vector-line"
                      />
                      <circle cx={targetLoc.center.x} cy={targetLoc.center.y} r="6" fill="#10B981" />
                    </g>
                  );
                })}

              {/* Station Markers */}
              {Object.entries(RESOURCE_STATIONS).map(([stKey, st]) => (
                <g key={stKey} transform={`translate(${st.x}, ${st.y})`} pointerEvents="none">
                  <circle r="7" fill="rgba(16, 185, 129, 0.2)" stroke="#10B981" strokeWidth="1.2" />
                  <circle r="3.5" fill="#10B981" />
                </g>
              ))}
            </g>
          )}

          {/* North Direction Indicator / Compass Rose */}
          <g transform="translate(1140, 720)" pointerEvents="none" opacity="0.65">
            <circle r="22" fill="#181d24" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="1" />
            <polygon points="0,-16 5,0 0,-3 -5,0" fill="#D4AF37" />
            <polygon points="0,16 5,0 0,3 -5,0" fill="rgba(255,255,255,0.4)" />
            <text y="-6" textAnchor="middle" fill="#D4AF37" fontSize="8" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
              N
            </text>
          </g>
        </g>
      </svg>

      {/* Map Legend Footer */}
      <div className="tactical-legend-bar">
        <div className="legend-item">
          <span className="legend-swatch p0-swatch" />
          <span>P0 Critical (90+)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch p1-swatch" />
          <span>P1 Serious (75+)</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch cctv-swatch" />
          <span>CCTV Cone</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch unit-swatch" />
          <span>Response Base</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch cordon-swatch" />
          <span>Active Cordon</span>
        </div>
      </div>
    </div>
  );
}
