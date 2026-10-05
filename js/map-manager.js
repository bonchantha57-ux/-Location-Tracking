/**
 * Unified Map Manager
 * Supports Native Google Maps JavaScript API with graceful fallback to high-resolution vector/satellite tiles
 */

class MapManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.currentProvider = 'fallback'; // 'google' or 'fallback'
        this.googleMap = null;
        this.leafletMap = null;
        this.leafletLayer = null;
        this.markers = new Map(); // id -> { marker, accuracyCircle, trailPolyline, element, data }
        this.connectionLine = null;
        this.googleTrafficLayer = null;
        this.currentMapType = localStorage.getItem(CONFIG.STORAGE_KEYS.MAP_TYPE) || 'dark';
        this.currentCenter = [CONFIG.DEFAULT_COORDS.lat, CONFIG.DEFAULT_COORDS.lng];
        this.currentZoom = CONFIG.DEFAULT_COORDS.zoom;
        this.onMapClickCallback = null;
    }

    async init(googleApiKey = null) {
        const storedKey = googleApiKey || localStorage.getItem(CONFIG.STORAGE_KEYS.GOOGLE_API_KEY);
        
        if (storedKey && storedKey.trim().length > 10) {
            try {
                await this.initGoogleMaps(storedKey.trim());
                this.currentProvider = 'google';
                return 'google';
            } catch (err) {
                console.warn("Failed to load Google Maps API, falling back to interactive tile engine:", err);
                this.initFallbackMap();
                this.currentProvider = 'fallback';
                return 'fallback_error';
            }
        } else {
            this.initFallbackMap();
            this.currentProvider = 'fallback';
            return 'fallback';
        }
    }

    /* ============================================================
       GOOGLE MAPS JAVASCRIPT API ENGINE
       ============================================================ */
    async initGoogleMaps(apiKey) {
        return new Promise((resolve, reject) => {
            // Check if Google Maps is already loaded
            if (window.google && window.google.maps) {
                this._createGoogleMapInstance();
                resolve();
                return;
            }

            // Window auth failure catcher
            window.gm_authFailure = () => {
                console.error("Google Maps authentication failure. Check your API key.");
                window.dispatchEvent(new CustomEvent('google-maps-auth-failed'));
            };

            const scriptId = 'google-maps-api-script';
            const existingScript = document.getElementById(scriptId);
            if (existingScript) existingScript.remove();

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=__onGoogleMapsReady`;
            script.async = true;
            script.defer = true;

            window.__onGoogleMapsReady = () => {
                try {
                    this._createGoogleMapInstance();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };

            script.onerror = (err) => reject(err);
            document.head.appendChild(script);
        });
    }

    _createGoogleMapInstance() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '';

        const mapStyles = this._getGoogleMapTheme(this.currentMapType);

        this.googleMap = new google.maps.Map(container, {
            center: { lat: this.currentCenter[0], lng: this.currentCenter[1] },
            zoom: this.currentZoom,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: false,
            styles: mapStyles,
            gestureHandling: 'greedy'
        });

        this.googleTrafficLayer = new google.maps.TrafficLayer();

        this.googleMap.addListener('click', (event) => {
            if (this.onMapClickCallback) {
                this.onMapClickCallback({
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                });
            }
        });
    }

    _getGoogleMapTheme(type) {
        if (type === 'satellite') {
            return []; // Use mapTypeId = 'hybrid'
        }
        if (type === 'light') {
            return [];
        }
        // Premium Dark / Cyberpunk theme
        return [
            { elementType: "geometry", stylers: [{ color: "#171c26" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#171c26" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8a9ba8" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#00f2fe" }]
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#60a5fa" }]
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ color: "#112628" }]
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [{ color: "#34d399" }]
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#242f3e" }]
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1e293b" }]
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#cbd5e1" }]
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#334155" }]
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1e293b" }]
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [{ color: "#f59e0b" }]
            },
            {
                featureType: "transit",
                elementType: "geometry",
                stylers: [{ color: "#1e293b" }]
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#0a1322" }]
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#38bdf8" }]
            }
        ];
    }

    /* ============================================================
       FALLBACK INTERACTIVE MAP ENGINE (LEAFLET / CARTO TILESET)
       ============================================================ */
    initFallbackMap() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '';

        if (this.leafletMap) {
            this.leafletMap.remove();
            this.leafletMap = null;
        }

        this.leafletMap = L.map(this.containerId, {
            center: this.currentCenter,
            zoom: this.currentZoom,
            zoomControl: false,
            attributionControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(this.leafletMap);

        this.updateMapTiles(this.currentMapType);

        this.leafletMap.on('click', (e) => {
            if (this.onMapClickCallback) {
                this.onMapClickCallback({
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                });
            }
        });
    }

    updateMapTiles(type) {
        this.currentMapType = type;
        localStorage.setItem(CONFIG.STORAGE_KEYS.MAP_TYPE, type);

        if (this.currentProvider === 'google' && this.googleMap) {
            if (type === 'satellite') {
                this.googleMap.setMapTypeId(google.maps.MapTypeId.HYBRID);
                this.googleMap.setOptions({ styles: [] });
            } else if (type === 'terrain') {
                this.googleMap.setMapTypeId(google.maps.MapTypeId.TERRAIN);
                this.googleMap.setOptions({ styles: [] });
            } else if (type === 'light') {
                this.googleMap.setMapTypeId(google.maps.MapTypeId.ROADMAP);
                this.googleMap.setOptions({ styles: [] });
            } else {
                this.googleMap.setMapTypeId(google.maps.MapTypeId.ROADMAP);
                this.googleMap.setOptions({ styles: this._getGoogleMapTheme('dark') });
            }
            return;
        }

        if (this.leafletMap) {
            if (this.leafletLayer) {
                this.leafletMap.removeLayer(this.leafletLayer);
            }

            let tileUrl = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
            let tileClass = '';

            if (type === 'dark') {
                tileUrl = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
                tileClass = 'map-tiles-dark-filter';
            } else if (type === 'satellite') {
                // Official Google Satellite Hybrid (Imagery + Labels & Roads)
                tileUrl = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
            } else if (type === 'terrain') {
                // Official Google Terrain (Elevations + Landmarks)
                tileUrl = 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
            } else if (type === 'traffic') {
                // Official Google Maps with Live Traffic
                tileUrl = 'https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}';
            } else {
                // Official Google Standard Roadmap
                tileUrl = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
            }

            this.leafletLayer = L.tileLayer(tileUrl, {
                maxZoom: 21,
                subdomains: ['0', '1', '2', '3'],
                className: tileClass,
                attribution: '© Google Maps'
            }).addTo(this.leafletMap);
        }
    }

    /* ============================================================
       MARKER & REAL-TIME BEACON MANAGEMENT
       ============================================================ */
    updateUserMarker(userData, isSelf = false) {
        const { id, name, lat, lng, speed = 0, heading = 0, accuracy = 10, avatar = '🚗', color = '#00f2fe', isSOS = false } = userData;

        if (this.currentProvider === 'google' && this.googleMap) {
            this._updateGoogleMarker(userData, isSelf);
        } else if (this.leafletMap) {
            this._updateLeafletMarker(userData, isSelf);
        }
    }

    _updateGoogleMarker(userData, isSelf) {
        const { id, name, lat, lng, speed = 0, heading = 0, accuracy = 10, avatar = '🚗', color = '#00f2fe', isSOS = false } = userData;
        const pos = new google.maps.LatLng(lat, lng);

        let record = this.markers.get(id);

        if (!record) {
            // Create Custom HTML Overlay
            const MarkerClass = getGoogleCustomMarkerClass();
            if (!MarkerClass) return;
            const overlay = new MarkerClass(pos, this.googleMap, userData, isSelf);
            
            // Create Accuracy Circle
            const circle = new google.maps.Circle({
                map: this.googleMap,
                center: pos,
                radius: Math.max(accuracy, 15),
                fillColor: color,
                fillOpacity: 0.12,
                strokeColor: color,
                strokeOpacity: 0.5,
                strokeWeight: 1.5
            });

            this.markers.set(id, {
                googleOverlay: overlay,
                googleCircle: circle,
                data: userData
            });
        } else {
            record.googleOverlay.update(pos, userData);
            record.googleCircle.setCenter(pos);
            record.googleCircle.setRadius(Math.max(accuracy, 15));
            record.googleCircle.setOptions({
                fillColor: isSOS ? '#ef4444' : color,
                strokeColor: isSOS ? '#ef4444' : color
            });
            record.data = userData;
        }
    }

    _updateLeafletMarker(userData, isSelf) {
        const { id, name, lat, lng, speed = 0, heading = 0, accuracy = 10, avatar = '🚗', color = '#00f2fe', isSOS = false } = userData;
        const latlng = [lat, lng];

        let record = this.markers.get(id);

        const customIcon = L.divIcon({
            className: 'live-beacon-marker-wrapper',
            html: `
                <div class="live-marker-container ${isSOS ? 'sos-pulse' : ''}" style="--beacon-color: ${color}">
                    <div class="beacon-wave wave-1"></div>
                    <div class="beacon-wave wave-2"></div>
                    <div class="beacon-core" style="border-color: ${color}">
                        <div class="beacon-avatar">${avatar}</div>
                        ${heading !== null ? `<div class="heading-arrow" style="transform: rotate(${heading}deg); border-bottom-color: ${color}"></div>` : ''}
                    </div>
                    <div class="marker-label-tag">
                        <span class="user-name">${this._escape(name)}</span>
                        ${speed > 1 ? `<span class="user-speed">${Math.round(speed)} km/h</span>` : ''}
                    </div>
                </div>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });

        if (!record) {
            const marker = L.marker(latlng, { icon: customIcon }).addTo(this.leafletMap);
            const circle = L.circle(latlng, {
                radius: Math.max(accuracy, 15),
                color: isSOS ? '#ef4444' : color,
                weight: 1.5,
                fillColor: isSOS ? '#ef4444' : color,
                fillOpacity: 0.12
            }).addTo(this.leafletMap);

            marker.on('click', () => {
                window.dispatchEvent(new CustomEvent('select-user', { detail: userData }));
            });

            this.markers.set(id, {
                leafletMarker: marker,
                leafletCircle: circle,
                data: userData
            });
        } else {
            record.leafletMarker.setLatLng(latlng);
            record.leafletMarker.setIcon(customIcon);
            record.leafletCircle.setLatLng(latlng);
            record.leafletCircle.setRadius(Math.max(accuracy, 15));
            record.leafletCircle.setStyle({
                color: isSOS ? '#ef4444' : color,
                fillColor: isSOS ? '#ef4444' : color
            });
            record.data = userData;
        }
    }

    removeUserMarker(id) {
        const record = this.markers.get(id);
        if (!record) return;

        if (record.googleOverlay) {
            record.googleOverlay.setMap(null);
            record.googleCircle.setMap(null);
        }
        if (record.leafletMarker) {
            this.leafletMap.removeLayer(record.leafletMarker);
            this.leafletMap.removeLayer(record.leafletCircle);
        }
        this.markers.delete(id);
    }

    /* ============================================================
       CONNECTING ROUTE / DISTANCE LINE
       ============================================================ */
    drawConnectionLine(fromCoord, toCoord, color = '#00f2fe') {
        this.clearConnectionLine();

        if (this.currentProvider === 'google' && this.googleMap) {
            this.connectionLine = new google.maps.Polyline({
                path: [
                    { lat: fromCoord.lat, lng: fromCoord.lng },
                    { lat: toCoord.lat, lng: toCoord.lng }
                ],
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 0.8,
                strokeWeight: 3,
                map: this.googleMap,
                icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '15px'
                }]
            });
        } else if (this.leafletMap) {
            this.connectionLine = L.polyline([
                [fromCoord.lat, fromCoord.lng],
                [toCoord.lat, toCoord.lng]
            ], {
                color: color,
                weight: 3,
                opacity: 0.85,
                dashArray: '8, 8'
            }).addTo(this.leafletMap);
        }
    }

    clearConnectionLine() {
        if (!this.connectionLine) return;
        if (this.currentProvider === 'google' && this.connectionLine.setMap) {
            this.connectionLine.setMap(null);
        } else if (this.leafletMap && this.leafletMap.hasLayer(this.connectionLine)) {
            this.leafletMap.removeLayer(this.connectionLine);
        }
        this.connectionLine = null;
    }

    /* ============================================================
       CAMERA & NAVIGATION
       ============================================================ */
    panTo(lat, lng, zoom = null) {
        this.currentCenter = [lat, lng];
        if (zoom) this.currentZoom = zoom;

        if (this.currentProvider === 'google' && this.googleMap) {
            this.googleMap.panTo({ lat, lng });
            if (zoom) this.googleMap.setZoom(zoom);
        } else if (this.leafletMap) {
            this.leafletMap.flyTo([lat, lng], zoom || this.leafletMap.getZoom(), {
                animate: true,
                duration: 1.2
            });
        }
    }

    fitAllMarkers() {
        if (this.markers.size === 0) return;

        if (this.currentProvider === 'google' && this.googleMap) {
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach((rec) => {
                bounds.extend(new google.maps.LatLng(rec.data.lat, rec.data.lng));
            });
            this.googleMap.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        } else if (this.leafletMap) {
            const group = [];
            this.markers.forEach((rec) => {
                group.push([rec.data.lat, rec.data.lng]);
            });
            this.leafletMap.fitBounds(group, { padding: [60, 60], maxZoom: 16 });
        }
    }

    setOnMapClick(callback) {
        this.onMapClickCallback = callback;
    }

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/* ============================================================
   GOOGLE MAPS CUSTOM HTML OVERLAY MARKER CLASS
   ============================================================ */
let GoogleCustomMarkerClass = null;

function getGoogleCustomMarkerClass() {
    if (GoogleCustomMarkerClass) return GoogleCustomMarkerClass;
    if (!window.google || !window.google.maps || !window.google.maps.OverlayView) return null;

    GoogleCustomMarkerClass = class extends google.maps.OverlayView {
        constructor(latlng, map, userData, isSelf) {
            super();
            this.latlng = latlng;
            this.userData = userData;
            this.isSelf = isSelf;
            this.div = null;
            this.setMap(map);
        }

        onAdd() {
            const div = document.createElement('div');
            div.className = 'live-beacon-marker-wrapper google-custom-marker';
            this.div = div;
            this._renderContent();

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('select-user', { detail: this.userData }));
            });

            const panes = this.getPanes();
            panes.overlayMouseTarget.appendChild(div);
        }

        draw() {
            const overlayProjection = this.getProjection();
            if (!overlayProjection || !this.div) return;

            const point = overlayProjection.fromLatLngToDivPixel(this.latlng);
            if (point) {
                this.div.style.left = (point.x - 24) + 'px';
                this.div.style.top = (point.y - 24) + 'px';
            }
        }

        onRemove() {
            if (this.div && this.div.parentNode) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
            }
        }

        update(latlng, userData) {
            this.latlng = latlng;
            this.userData = userData;
            if (this.div) {
                this._renderContent();
                this.draw();
            }
        }

        _renderContent() {
            if (!this.div) return;
            const { name, speed = 0, heading = 0, avatar = '🚗', color = '#00f2fe', isSOS = false } = this.userData;

            this.div.innerHTML = `
                <div class="live-marker-container ${isSOS ? 'sos-pulse' : ''}" style="--beacon-color: ${color}">
                    <div class="beacon-wave wave-1"></div>
                    <div class="beacon-wave wave-2"></div>
                    <div class="beacon-core" style="border-color: ${color}">
                        <div class="beacon-avatar">${avatar}</div>
                        ${heading !== null ? `<div class="heading-arrow" style="transform: rotate(${heading}deg); border-bottom-color: ${color}"></div>` : ''}
                    </div>
                    <div class="marker-label-tag">
                        <span class="user-name">${name}</span>
                        ${speed > 1 ? `<span class="user-speed">${Math.round(speed)} km/h</span>` : ''}
                    </div>
                </div>
            `;
        }
    };

    return GoogleCustomMarkerClass;
}
