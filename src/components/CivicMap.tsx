import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { CivicTheme, LanguageCode } from '../types';
import { translations } from '../translations';
import { MapPin, Sparkles, HelpCircle, FileText, CheckCircle, Info } from 'lucide-react';

const MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export const hasValidMapsKey = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY' && MAPS_API_KEY !== '';

// Handcrafted coordinates for known Bhubaneswar localities
export function getCoordinatesForLocality(locality: string): { lat: number; lng: number } {
  const normalized = (locality || "").trim().toLowerCase();
  
  if (normalized.includes("patia")) {
    return { lat: 20.3533, lng: 85.8278 };
  } else if (normalized.includes("damana")) {
    return { lat: 20.3344, lng: 85.8225 };
  } else if (normalized.includes("niladri")) {
    return { lat: 20.3400, lng: 85.8150 };
  } else if (normalized.includes("central park") || normalized.includes("park")) {
    return { lat: 20.2600, lng: 85.8300 };
  } else if (normalized.includes("bazaar") || normalized.includes("market") || normalized.includes("daily bazaar")) {
    return { lat: 20.3000, lng: 85.8100 };
  } else if (normalized.includes("nayapalli")) {
    return { lat: 20.3008, lng: 85.8039 };
  } else if (normalized.includes("acharya vihar") || normalized.includes("acharya")) {
    return { lat: 20.2925, lng: 85.8378 };
  } else if (normalized.includes("saheed nagar") || normalized.includes("saheed")) {
    return { lat: 20.2866, lng: 85.8422 };
  } else if (normalized.includes("cs pur") || normalized.includes("chandrasekharpur")) {
    return { lat: 20.3255, lng: 85.8172 };
  }

  // Fallback: Hash the locality string to seed coordinates close to Bhubaneswar (20.2961, 85.8245)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) / 2000); // between -0.05 and 0.05
  const lngOffset = (((hash >> 8) % 100) / 2000);
  return {
    lat: 20.2961 + latOffset,
    lng: 85.8245 + lngOffset,
  };
}

// Get marker background color based on category
export function getCategoryMarkerColor(category: string): string {
  switch (category) {
    case 'ROADS': return '#D4AF37'; // Golden
    case 'WATER': return '#3B82F6'; // Blue
    case 'DRAINAGE': return '#F97316'; // Orange
    case 'ELECTRICITY': return '#EAB308'; // Yellow
    case 'SANITATION': return '#10B981'; // Green
    case 'HEALTHCARE': return '#EF4444'; // Red
    case 'EDUCATION': return '#8B5CF6'; // Purple
    case 'TRANSPORT': return '#6366F1'; // Indigo
    default: return '#64748B'; // Slate
  }
}

interface CivicMapProps {
  themes: CivicTheme[];
  selectedThemeId?: string | null;
  onSelectTheme?: (theme: CivicTheme) => void;
  interactiveSelectionMode?: boolean; // If true, citizen can click map to pick coordinates/locality
  onLocationSelected?: (localityName: string, lat: number, lng: number) => void;
  lang: LanguageCode;
}

// Marker with InfoWindow helper using recommended hook-based advanced anchor pattern
function ThemeMarker({ 
  theme, 
  isSelected, 
  onSelect,
  lang
}: { 
  key?: string | number;
  theme: CivicTheme; 
  isSelected: boolean; 
  onSelect?: (theme: CivicTheme) => void;
  lang: LanguageCode;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isOpen, setIsOpen] = useState(false);
  const position = getCoordinatesForLocality(theme.locality);
  const color = getCategoryMarkerColor(theme.category);
  const t = translations[lang];

  useEffect(() => {
    if (isSelected) {
      setIsOpen(true);
    }
  }, [isSelected]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={() => {
          setIsOpen(true);
          if (onSelect) onSelect(theme);
        }}
      >
        <Pin 
          background={color} 
          glyphColor="#000000" 
          borderColor={isSelected ? "#FFFFFF" : "#000000"} 
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isOpen && (
        <InfoWindow 
          anchor={marker} 
          onCloseClick={() => setIsOpen(false)}
        >
          <div className="p-2 text-slate-900 max-w-sm space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white font-mono" style={{ backgroundColor: color }}>
                {theme.category}
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold flex items-center gap-0.5">
                <MapPin size={10} /> {theme.locality}
              </span>
            </div>
            
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {theme.canonicalTitle}
            </h4>
            
            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
              {theme.aiInsight}
            </p>

            <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-100 pt-1.5">
              <span className="text-slate-500">{theme.reportCount} reports</span>
              <span className="font-bold text-amber-700">Urgency: {theme.averageUrgency}/5</span>
            </div>
            
            {onSelect && (
              <button 
                onClick={() => onSelect(theme)}
                className="w-full text-center py-1 mt-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-[10px] font-semibold transition-all"
              >
                Inspect Theme Details
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function CivicMap({ 
  themes, 
  selectedThemeId, 
  onSelectTheme, 
  interactiveSelectionMode = false,
  onLocationSelected,
  lang
}: CivicMapProps) {
  const t = translations[lang];
  const bhubaneswarCenter = { lat: 20.2961, lng: 85.8245 };
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Handle map click in interactive selection mode
  const handleMapClick = (e: any) => {
    if (!interactiveSelectionMode || !onLocationSelected) return;
    
    const latLng = e.detail?.latLng || e.latLng;
    if (!latLng) return;

    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

    setClickedLocation({ lat, lng });

    // Determine nearest seed locality or describe it beautifully
    let selectedLocalityName = "Bhubaneswar Central";
    let minDistance = Infinity;

    const knownLocalities = ["Patia", "Damana", "Niladri Vihar", "Central Park Area", "Daily Bazaar", "Nayapalli", "Acharya Vihar", "Saheed Nagar", "Chandrasekharpur"];
    for (const loc of knownLocalities) {
      const coords = getCoordinatesForLocality(loc);
      const dist = Math.sqrt(Math.pow(coords.lat - lat, 2) + Math.pow(coords.lng - lng, 2));
      if (dist < minDistance) {
        minDistance = dist;
        selectedLocalityName = loc;
      }
    }

    // If click is somewhat far from closest known, describe it generally or use closest
    if (minDistance > 0.015) {
      selectedLocalityName = `${selectedLocalityName} Border`;
    }

    onLocationSelected(selectedLocalityName, lat, lng);
  };

  // Render Setup / Instruction Panel when key is not configured
  const renderApiKeyInstructions = () => {
    return (
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-[#222] bg-[#090909] flex flex-col items-center justify-center p-6 text-center">
        {/* Abstract Stylized Vector Grid Fallback Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none select-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Mock Coordinates Lines */}
            <circle cx="250" cy="150" r="40" fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="4" />
            <circle cx="250" cy="150" r="100" fill="none" stroke="#D4AF37" strokeWidth="0.5" strokeDasharray="8" />
            {/* Draw mock pins on the grid */}
            <circle cx="120" cy="80" r="4" fill="#D4AF37" />
            <circle cx="340" cy="110" r="4" fill="#3B82F6" />
            <circle cx="220" cy="220" r="4" fill="#F97316" />
            <circle cx="180" cy="140" r="4" fill="#10B981" />
          </svg>
        </div>

        <div className="relative z-10 max-w-lg space-y-4 p-4 bg-[#0A0A0A]/90 border border-[#1A1A1A] rounded-xl backdrop-blur shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37]">
            <MapPin size={22} className="animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-serif italic text-white flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-[#D4AF37]" />
              Interactive Civic Map Sandbox
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enable full real-time spatial geocoding and vector terrain views of Bhubaneswar by linking your Google Maps Platform credential.
            </p>
          </div>

          <div className="p-3 bg-[#111] border border-[#222] rounded-lg text-left text-[11px] font-mono text-slate-300 space-y-1">
            <span className="text-[#D4AF37] font-semibold block mb-1">To Link Google Maps API Key:</span>
            <div className="flex gap-1.5">
              <span className="text-slate-500">1.</span>
              <span>Get a key from the <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline hover:text-white">Google Cloud Console</a></span>
            </div>
            <div className="flex gap-1.5">
              <span className="text-slate-500">2.</span>
              <span>Click the ⚙️ <strong className="text-white">Settings</strong> gear icon (top-right of AI Studio)</span>
            </div>
            <div className="flex gap-1.5">
              <span className="text-slate-500">3.</span>
              <span>Choose <strong className="text-white">Secrets</strong>, add <code className="text-[#D4AF37] font-bold">GOOGLE_MAPS_PLATFORM_KEY</code></span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-1">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Info size={11} className="text-slate-400" />
              <span>Seeds loaded: {themes.length} districts</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If no key is configured, show the gorgeous interactive mock georadar
  if (!hasValidMapsKey) {
    return (
      <div className="space-y-4">
        {renderApiKeyInstructions()}
        
        {/* Mock interactive sandbox dashboard below */}
        <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-bold flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#D4AF37] animate-pulse" />
              Sandbox Geo-Simulator
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Bhubaneswar Regional Grid</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {themes.map(theme => {
              const coords = getCoordinatesForLocality(theme.locality);
              const color = getCategoryMarkerColor(theme.category);
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    if (onSelectTheme) onSelectTheme(theme);
                    // Mock coordinate callback for interactive demonstration
                    if (interactiveSelectionMode && onLocationSelected) {
                      onLocationSelected(theme.locality, coords.lat, coords.lng);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col justify-between h-20 bg-[#070707] hover:bg-[#111] cursor-pointer ${
                    selectedThemeId === theme.id ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30' : 'border-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[9px] px-1.5 py-0.2 rounded text-black font-bold uppercase truncate" style={{ backgroundColor: color }}>
                      {theme.category}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono font-medium">{theme.locality}</span>
                  </div>
                  <div className="font-serif italic text-white truncate mt-1.5 w-full">{theme.canonicalTitle}</div>
                  <div className="text-[9px] text-slate-400 mt-1 flex justify-between w-full font-mono">
                    <span>{theme.reportCount} reports</span>
                    <span className="text-[#D4AF37]">Urgency: {theme.averageUrgency}/5</span>
                  </div>
                </button>
              );
            })}
          </div>

          {interactiveSelectionMode && (
            <div className="p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-[11px] text-[#D4AF37] flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              <span>Clicking any sandbox district above will auto-populate the reporting locality input field!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Live real Google Map when credential is valid!
  return (
    <div className="space-y-4">
      <div className="w-full h-[320px] rounded-xl overflow-hidden border border-[#222] relative">
        <APIProvider apiKey={MAPS_API_KEY} version="weekly">
          <Map
            defaultCenter={bhubaneswarCenter}
            defaultZoom={12}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Active themes pins */}
            {themes.map(theme => (
              <ThemeMarker
                key={theme.id}
                theme={theme}
                isSelected={selectedThemeId === theme.id}
                onSelect={onSelectTheme}
                lang={lang}
              />
            ))}

            {/* Click pin placement in selection mode */}
            {interactiveSelectionMode && clickedLocation && (
              <AdvancedMarker position={clickedLocation}>
                <Pin background="#FFFFFF" glyphColor="#D4AF37" scale={1.1} />
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>

        {interactiveSelectionMode && (
          <div className="absolute bottom-3 left-3 bg-[#0A0A0A]/90 border border-[#222] px-3 py-1.5 rounded-lg text-[10px] text-[#D4AF37] font-mono flex items-center gap-1.5 shadow-xl backdrop-blur">
            <Info size={12} />
            <span>Click anywhere on the map to set report location coordinates!</span>
          </div>
        )}
      </div>

      {interactiveSelectionMode && (
        <div className="bg-[#0C0C0C] border border-[#1A1A1A] p-3 rounded-lg text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>Active Location: {clickedLocation ? `${clickedLocation.lat.toFixed(4)}, ${clickedLocation.lng.toFixed(4)}` : "Not pinned yet"}</span>
          <span className="text-[10px] text-slate-500">Google Maps Platform Active</span>
        </div>
      )}
    </div>
  );
}

// Simple Lucide icons for backward compatibility inside CivicMap context
function Activity({ className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
