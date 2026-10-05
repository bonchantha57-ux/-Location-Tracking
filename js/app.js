/**
 * Main Application Orchestrator
 * Real-Time Mutual Location Tracking
 */

class App {
    constructor() {
        this.mapManager = null;
        this.network = null;
        this.currentLang = localStorage.getItem(CONFIG.STORAGE_KEYS.LANGUAGE) || 'km';
        this.roomId = this._resolveRoomId();
        
        // User Profile
        this.userProfile = {
            name: localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME) || ('អ្នកប្រើប្រាស់ ' + Math.floor(100 + Math.random() * 900)),
            avatar: localStorage.getItem(CONFIG.STORAGE_KEYS.USER_AVATAR) || '🚗',
            color: localStorage.getItem(CONFIG.STORAGE_KEYS.USER_COLOR) || '#00f2fe'
        };

        // Self State
        this.myLocation = {
            lat: CONFIG.DEFAULT_COORDS.lat,
            lng: CONFIG.DEFAULT_COORDS.lng,
            speed: 0,
            heading: 0,
            accuracy: 10,
            battery: 95,
            isSOS: false
        };

        this.selectedPeerId = null;
        this.isSelfSimulating = false;
        this.isCompanionActive = false;
        this.isAutoFollow = true;
        this.isGPSLocked = false;
        this.watchPositionId = null;
        this.gpsHeartbeatInterval = null;
        this.wakeLock = null;
        this.batteryWatcher = null;

        this.init();
    }

    _resolveRoomId() {
        const urlParams = new URLSearchParams(window.location.search);
        let room = urlParams.get('room');
        if (!room) {
            room = localStorage.getItem(CONFIG.STORAGE_KEYS.ROOM_ID);
        }
        if (!room) {
            room = 'TRACK-' + Math.floor(1000 + Math.random() * 9000);
        }
        localStorage.setItem(CONFIG.STORAGE_KEYS.ROOM_ID, room);
        return room;
    }

    async init() {
        this._applyTranslations();
        this._renderAvatarAndColorPickers();
        this._bindEventListeners();
        this._initBatteryStatus();

        // Initialize Map
        this.mapManager = new MapManager('map');
        const googleKey = localStorage.getItem(CONFIG.STORAGE_KEYS.GOOGLE_API_KEY);
        const providerStatus = await this.mapManager.init(googleKey);
        this._updateProviderUI(providerStatus);

        // Map Click Teleport (for quick testing)
        this.mapManager.setOnMapClick((coords) => {
            this.myLocation.lat = coords.lat;
            this.myLocation.lng = coords.lng;
            this._broadcastMyLocation();
            this._updateMyMarker();
            this._recalculateDistanceToSelected();
            this._showToast(this.currentLang === 'km' ? '📍 បានផ្លាស់ប្តូរទីតាំងសាកល្បង!' : '📍 Test location updated!');
        });

        // Initialize Network
        this.network = new TrackerNetwork();
        this.network.onPeerUpdateCallback = (data) => this._onPeerUpdate(data);
        this.network.onPeerLeaveCallback = (peerId) => this._onPeerLeave(peerId);
        this.network.onSOSCallback = (sosData) => this._onSOSReceived(sosData);
        this.network.onStatusChangeCallback = (status) => this._onNetworkStatusChange(status);

        this.network.connect(this.roomId);

        // Immediately request current locations of all peers in room
        setTimeout(() => {
            if (this.network) this.network.requestLocation();
        }, 1200);

        // Start Real GPS Geolocation Watcher
        this._startGeolocationWatcher();

        // Listen for new peers asking for our coords
        window.addEventListener('new-peer-joined', () => {
            this._broadcastMyLocation();
        });

        // Listen for peer location requests (ស្នើសុំទីតាំង)
        window.addEventListener('request-my-location', (e) => {
            this._broadcastMyLocation();
            if (window.soundEngine) window.soundEngine.playPing();
        });

        // Listen for user marker selection
        window.addEventListener('select-user', (e) => {
            this._selectUser(e.detail);
        });

        // Listen for Google Maps auth failure
        window.addEventListener('google-maps-auth-failed', () => {
            this._showToast("⚠️ Google Maps API Key មិនត្រឹមត្រូវ! កំពុងប្តូរទៅ Preview Map...");
            this.mapManager.initFallbackMap();
            this._updateProviderUI('fallback');
        });

        // Periodic Location Broadcast (Keep-Alive Heartbeat every 2.5s)
        setInterval(() => {
            this._broadcastMyLocation();
        }, 2500);

        // Initialize UI Elements
        document.getElementById('room-id-display').textContent = this.roomId;
        document.getElementById('my-name-display').textContent = this.userProfile.name;
        document.getElementById('my-avatar-display').textContent = this.userProfile.avatar;

        // Auto-center map on initial position
        setTimeout(() => {
            this._updateMyMarker();
            this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng, 15);
        }, 600);
    }

    /* ============================================================
       GEOLOCATION & CONTINUOUS GPS LOCKING
       ============================================================ */
    requestGPSPermission() {
        if (!('geolocation' in navigator)) {
            this._showToast(this.currentLang === 'km' ? 'កម្មវិធីរុករកនេះមិនគាំទ្រ Geolocation ទេ' : 'Geolocation is not supported by your browser');
            return;
        }

        // Direct user-gesture invocation for mobile phones
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.isGPSLocked = true;
                this.myLocation.lat = pos.coords.latitude;
                this.myLocation.lng = pos.coords.longitude;
                this.myLocation.accuracy = Math.round(pos.coords.accuracy || 5);
                this.myLocation.speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
                if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
                    this.myLocation.heading = Math.round(pos.coords.heading);
                }

                // Hide banner
                const banner = document.getElementById('gps-banner');
                if (banner) banner.classList.add('hidden');

                this._updateMyMarker();
                this._broadcastMyLocation();
                this._updateHUDStats();
                this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng, 16);
                this._showToast(TRANSLATIONS[this.currentLang].gps_locked);

                this._startContinuousGPSLock();
                this._requestWakeLock();
            },
            (err) => {
                console.warn("GPS request rejected or timed out:", err);
                this._showToast(TRANSLATIONS[this.currentLang].gps_failed);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );
    }

    _startGeolocationWatcher() {
        if ('geolocation' in navigator) {
            this.watchPositionId = navigator.geolocation.watchPosition(
                (pos) => {
                    this.isGPSLocked = true;
                    const banner = document.getElementById('gps-banner');
                    if (banner) banner.classList.add('hidden');

                    if (!this.isSelfSimulating) {
                        this.myLocation.lat = pos.coords.latitude;
                        this.myLocation.lng = pos.coords.longitude;
                        this.myLocation.accuracy = Math.round(pos.coords.accuracy || 5);
                        this.myLocation.speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
                        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
                            this.myLocation.heading = Math.round(pos.coords.heading);
                        }

                        this._updateMyMarker();
                        this._broadcastMyLocation();
                        this._updateHUDStats();
                        this._recalculateDistanceToSelected();

                        if (this.isAutoFollow) {
                            this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng);
                        }
                    }
                },
                (err) => {
                    console.info("Geolocation watcher info:", err.message);
                    this._updateMyMarker();
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 10000
                }
            );

            // Also start high-frequency continuous GPS lock heartbeat
            this._startContinuousGPSLock();
            this._requestWakeLock();
        }
    }

    _startContinuousGPSLock() {
        if (this.gpsHeartbeatInterval) clearInterval(this.gpsHeartbeatInterval);

        // Continuous GPS Heartbeat every 2.5 seconds to guarantee active lock
        this.gpsHeartbeatInterval = setInterval(() => {
            if (this.isSelfSimulating || !('geolocation' in navigator)) return;

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.isGPSLocked = true;
                    const banner = document.getElementById('gps-banner');
                    if (banner) banner.classList.add('hidden');

                    this.myLocation.lat = pos.coords.latitude;
                    this.myLocation.lng = pos.coords.longitude;
                    this.myLocation.accuracy = Math.round(pos.coords.accuracy || 5);
                    this.myLocation.speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
                    if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
                        this.myLocation.heading = Math.round(pos.coords.heading);
                    }

                    this._updateMyMarker();
                    this._broadcastMyLocation();
                    this._updateHUDStats();
                    this._recalculateDistanceToSelected();

                    if (this.isAutoFollow) {
                        this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng);
                    }
                },
                () => {},
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 4000
                }
            );
        }, 2500);
    }

    _requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen').then((lock) => {
                    this.wakeLock = lock;
                }).catch(() => {});
            } catch (e) {}
        }
    }

    _initBatteryStatus() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then((battery) => {
                this.myLocation.battery = Math.round(battery.level * 100);
                battery.addEventListener('levelchange', () => {
                    this.myLocation.battery = Math.round(battery.level * 100);
                    this._updateHUDStats();
                });
            }).catch(() => {});
        }
    }

    /* ============================================================
       LOCATION BROADCASTING & MARKER REFRESH
       ============================================================ */
    _broadcastMyLocation() {
        if (!this.network) return;

        this.network.broadcastLocation({
            name: this.userProfile.name,
            avatar: this.userProfile.avatar,
            color: this.userProfile.color,
            lat: this.myLocation.lat,
            lng: this.myLocation.lng,
            speed: this.myLocation.speed,
            heading: this.myLocation.heading,
            accuracy: this.myLocation.accuracy,
            battery: this.myLocation.battery,
            isSOS: this.myLocation.isSOS
        });
    }

    _updateMyMarker() {
        this.mapManager.updateUserMarker({
            id: 'self_' + this.network.userId,
            name: this.userProfile.name + ' (' + (this.currentLang === 'km' ? 'អ្នក' : 'You') + ')',
            lat: this.myLocation.lat,
            lng: this.myLocation.lng,
            speed: this.myLocation.speed,
            heading: this.myLocation.heading,
            accuracy: this.myLocation.accuracy,
            avatar: this.userProfile.avatar,
            color: this.userProfile.color,
            isSOS: this.myLocation.isSOS
        }, true);
    }

    _onPeerUpdate(peerData) {
        this.mapManager.updateUserMarker(peerData, false);
        this._renderRosterList();

        // If this peer is the currently selected target, update connection line & stats
        if (this.selectedPeerId === peerData.id) {
            this._recalculateDistanceToSelected();
        }

        if (window.soundEngine) {
            window.soundEngine.playPing();
        }
    }

    _onPeerLeave(peerId) {
        this.mapManager.removeUserMarker(peerId);
        if (this.selectedPeerId === peerId) {
            this.selectedPeerId = null;
            this.mapManager.clearConnectionLine();
            document.getElementById('target-stats-card').classList.add('hidden');
        }
        this._renderRosterList();
    }

    _onSOSReceived(sosMsg) {
        if (window.soundEngine) window.soundEngine.playSOS();
        const senderName = sosMsg.data && sosMsg.data.name ? sosMsg.data.name : 'Participant';
        this._showToast(`🚨 SOS! ${senderName} ${this.currentLang === 'km' ? 'បានបញ្ជូនសញ្ញាអាសន្ន!' : 'broadcasted an emergency alert!'}`, 6000);
        
        if (sosMsg.data && sosMsg.data.lat) {
            this.mapManager.panTo(sosMsg.data.lat, sosMsg.data.lng, 16);
            this._selectUser(sosMsg.data);
        }
    }

    _onNetworkStatusChange(status) {
        const dot = document.getElementById('status-indicator-dot');
        const text = document.getElementById('status-indicator-text');
        const t = TRANSLATIONS[this.currentLang];

        if (status === 'online') {
            dot.className = 'status-dot online';
            text.textContent = t.live_status;
        } else if (status === 'connecting') {
            dot.className = 'status-dot connecting';
            text.textContent = t.connecting;
        } else {
            dot.className = 'status-dot local';
            text.textContent = 'LOCAL SYNC';
        }
    }

    /* ============================================================
       SELECTION, DISTANCE & BEARING COMPUTATION
       ============================================================ */
    _selectUser(userData) {
        if (userData.id.startsWith('self_')) {
            // Clicked on self
            this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng, 16);
            return;
        }

        this.selectedPeerId = userData.id;
        this.mapManager.panTo(userData.lat, userData.lng, 16);
        this._recalculateDistanceToSelected();
    }

    _recalculateDistanceToSelected() {
        if (!this.selectedPeerId) return;

        let targetData = null;
        if (this.selectedPeerId === 'sim_companion_dara') {
            targetData = window.routeSimulator.companionData;
        } else {
            const peerRecord = this.network.peers.get(this.selectedPeerId);
            if (peerRecord) targetData = peerRecord.data;
        }

        if (!targetData) {
            this.mapManager.clearConnectionLine();
            document.getElementById('target-stats-card').classList.add('hidden');
            return;
        }

        // Draw dynamic line
        this.mapManager.drawConnectionLine(
            { lat: this.myLocation.lat, lng: this.myLocation.lng },
            { lat: targetData.lat, lng: targetData.lng },
            targetData.color || '#00f2fe'
        );

        // Compute metrics
        const distMeters = window.routeSimulator.calculateDistance(
            this.myLocation.lat, this.myLocation.lng,
            targetData.lat, targetData.lng
        );

        const bearing = window.routeSimulator.calculateBearing(
            this.myLocation.lat, this.myLocation.lng,
            targetData.lat, targetData.lng
        );

        // Estimate driving travel time (assuming ~30 km/h average city speed)
        const speedMps = 30 * 1000 / 3600;
        const etaMinutes = Math.max(1, Math.round(distMeters / speedMps / 60));

        // Display in target card
        const card = document.getElementById('target-stats-card');
        card.classList.remove('hidden');

        document.getElementById('target-name').textContent = targetData.name;
        document.getElementById('target-avatar').textContent = targetData.avatar || '🚗';

        let distStr = distMeters > 1000 ? `${(distMeters / 1000).toFixed(2)} km` : `${Math.round(distMeters)} m`;
        document.getElementById('target-distance-val').textContent = distStr;
        document.getElementById('target-eta-val').textContent = `${etaMinutes} min`;
        document.getElementById('target-speed-val').textContent = `${Math.round(targetData.speed || 0)} km/h`;
    }

    /* ============================================================
       ROSTER & ACTIVE USER LIST RENDERING
       ============================================================ */
    _renderRosterList() {
        const container = document.getElementById('active-users-list');
        const countBadge = document.getElementById('members-count-badge');
        const t = TRANSLATIONS[this.currentLang];

        const peers = this.network.getPeersList();
        const totalCount = peers.length + 1 + (this.isCompanionActive ? 1 : 0);
        countBadge.textContent = totalCount;

        let html = '';

        // Self Row
        html += `
            <div class="user-roster-item self-item" onclick="app.mapManager.panTo(${this.myLocation.lat}, ${this.myLocation.lng}, 16)">
                <div class="roster-avatar-box" style="background: ${this.userProfile.color}22; border-color: ${this.userProfile.color}">
                    <span class="avatar-emoji">${this.userProfile.avatar}</span>
                </div>
                <div class="roster-info">
                    <div class="roster-name-row">
                        <span class="roster-name">${this._escape(this.userProfile.name)}</span>
                        <span class="badge self-badge">${t.you_badge}</span>
                    </div>
                    <div class="roster-metrics">
                        <span>⚡ ${this.myLocation.speed} ${t.kmh}</span>
                        <span>🎯 ±${this.myLocation.accuracy}${t.meters}</span>
                        <span>🔋 ${this.myLocation.battery}%</span>
                    </div>
                </div>
                <button class="icon-btn-micro" title="${t.focus_user}">
                    <i data-lucide="crosshair"></i>
                </button>
            </div>
        `;

        // Virtual Companion Row (if active)
        if (this.isCompanionActive) {
            const comp = window.routeSimulator.companionData;
            const dist = Math.round(window.routeSimulator.calculateDistance(
                this.myLocation.lat, this.myLocation.lng, comp.lat, comp.lng
            ));
            const distStr = dist > 1000 ? `${(dist / 1000).toFixed(1)} ${t.km}` : `${dist} ${t.meters}`;

            html += `
                <div class="user-roster-item companion-item ${this.selectedPeerId === comp.id ? 'active-selection' : ''}" 
                     onclick="app._selectUser(window.routeSimulator.companionData)">
                    <div class="roster-avatar-box" style="background: ${comp.color}22; border-color: ${comp.color}">
                        <span class="avatar-emoji">${comp.avatar}</span>
                    </div>
                    <div class="roster-info">
                        <div class="roster-name-row">
                            <span class="roster-name">${comp.name}</span>
                            <span class="badge companion-badge">VIRTUAL</span>
                        </div>
                        <div class="roster-metrics">
                            <span>⚡ ${comp.speed} ${t.kmh}</span>
                            <span>📏 ${distStr}</span>
                            <span>🔋 ${comp.battery}%</span>
                        </div>
                    </div>
                    <button class="icon-btn-micro" title="${t.focus_user}">
                        <i data-lucide="navigation"></i>
                    </button>
                </div>
            `;
        }

        // Real Connected Peers
        peers.forEach((peer) => {
            const dist = Math.round(window.routeSimulator.calculateDistance(
                this.myLocation.lat, this.myLocation.lng, peer.lat, peer.lng
            ));
            const distStr = dist > 1000 ? `${(dist / 1000).toFixed(1)} ${t.km}` : `${dist} ${t.meters}`;

            html += `
                <div class="user-roster-item ${this.selectedPeerId === peer.id ? 'active-selection' : ''} ${peer.isSOS ? 'sos-glow' : ''}"
                     onclick='app._selectUser(${JSON.stringify(peer)})'>
                    <div class="roster-avatar-box" style="background: ${peer.color || '#00f2fe'}22; border-color: ${peer.color || '#00f2fe'}">
                        <span class="avatar-emoji">${peer.avatar || '🚗'}</span>
                    </div>
                    <div class="roster-info">
                        <div class="roster-name-row">
                            <span class="roster-name">${this._escape(peer.name)}</span>
                            ${peer.isSOS ? `<span class="badge sos-badge">SOS</span>` : ''}
                        </div>
                        <div class="roster-metrics">
                            <span>⚡ ${Math.round(peer.speed || 0)} ${t.kmh}</span>
                            <span>📏 ${distStr}</span>
                            <span>🔋 ${peer.battery || 100}%</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <button class="icon-btn-micro" onclick="event.stopPropagation(); app.requestPeerLocation('${peer.id}')" title="${t.request_peer_location}">
                            <i data-lucide="radio"></i>
                        </button>
                        <button class="icon-btn-micro" onclick="event.stopPropagation(); app.mapManager.panTo(${peer.lat}, ${peer.lng}, 16)" title="${t.focus_user}">
                            <i data-lucide="navigation"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    requestPeerLocation(peerId) {
        if (!this.network) return;
        this.network.requestLocation(peerId);
        if (window.soundEngine) window.soundEngine.playPing();
        this._showToast(TRANSLATIONS[this.currentLang].request_sent);
    }

    _updateHUDStats() {
        document.getElementById('hud-speed-val').textContent = this.myLocation.speed;
        document.getElementById('hud-accuracy-val').textContent = `±${this.myLocation.accuracy}m`;
        document.getElementById('hud-battery-val').textContent = `${this.myLocation.battery}%`;
    }

    /* ============================================================
       SIMULATION & TESTING MODES
       ============================================================ */
    toggleSelfSimulation() {
        this.isSelfSimulating = !this.isSelfSimulating;
        const btn = document.getElementById('simulate-self-btn');
        const t = TRANSLATIONS[this.currentLang];

        if (this.isSelfSimulating) {
            btn.classList.add('active');
            btn.innerHTML = `<i data-lucide="pause"></i> <span>${t.stop_simulate}</span>`;
            window.routeSimulator.startSelfSimulation((simCoords) => {
                this.myLocation.lat = simCoords.lat;
                this.myLocation.lng = simCoords.lng;
                this.myLocation.speed = simCoords.speed;
                this.myLocation.heading = simCoords.heading;
                this.myLocation.accuracy = simCoords.accuracy;

                this._updateMyMarker();
                this._broadcastMyLocation();
                this._updateHUDStats();
                this._recalculateDistanceToSelected();
            });
            this._showToast(this.currentLang === 'km' ? '🚗 បានចាប់ផ្តើមបើកបរផ្លូវសាកល្បង!' : '🚗 Drive simulation started!');
        } else {
            btn.classList.remove('active');
            btn.innerHTML = `<i data-lucide="play"></i> <span>${t.simulate_btn}</span>`;
            window.routeSimulator.stopSelfSimulation();
            this.myLocation.speed = 0;
            this._updateMyMarker();
            this._broadcastMyLocation();
            this._updateHUDStats();
        }

        if (window.lucide) window.lucide.createIcons();
    }

    toggleCompanionSimulation() {
        this.isCompanionActive = !this.isCompanionActive;
        const toggleCheck = document.getElementById('companion-toggle');
        toggleCheck.checked = this.isCompanionActive;

        if (this.isCompanionActive) {
            window.routeSimulator.startCompanion((compData) => {
                this.mapManager.updateUserMarker(compData, false);
                this._renderRosterList();
                if (this.selectedPeerId === compData.id) {
                    this._recalculateDistanceToSelected();
                }
            });
            this._showToast(this.currentLang === 'km' ? '🛵 បានបន្ថែមមិត្តភក្តិ តារា (Dara) លើផ្លូវ!' : '🛵 Added virtual friend Dara on route!');
            // Auto fit view to show both
            setTimeout(() => this.mapManager.fitAllMarkers(), 800);
        } else {
            window.routeSimulator.stopCompanion();
            this.mapManager.removeUserMarker(window.routeSimulator.companionData.id);
            if (this.selectedPeerId === window.routeSimulator.companionData.id) {
                this.selectedPeerId = null;
                this.mapManager.clearConnectionLine();
                document.getElementById('target-stats-card').classList.add('hidden');
            }
            this._renderRosterList();
        }
    }

    /* ============================================================
       SOS EMERGENCY ALERT
       ============================================================ */
    toggleSOS() {
        this.myLocation.isSOS = !this.myLocation.isSOS;
        const sosBtn = document.getElementById('sos-btn');

        if (this.myLocation.isSOS) {
            sosBtn.classList.add('active');
            document.body.classList.add('emergency-strobe');
            if (window.soundEngine) window.soundEngine.playSOS();
            this.network.broadcastSOS(this.myLocation, true);
            this._broadcastMyLocation();
            this._updateMyMarker();
            this._showToast(TRANSLATIONS[this.currentLang].sos_active, 8000);
        } else {
            sosBtn.classList.remove('active');
            document.body.classList.remove('emergency-strobe');
            this.network.broadcastSOS(this.myLocation, false);
            this._broadcastMyLocation();
            this._updateMyMarker();
        }
    }

    /* ============================================================
       SHARING & QR CODE
       ============================================================ */
    getShareUrl() {
        const url = new URL(window.location.href);
        url.searchParams.set('room', this.roomId);
        return url.toString();
    }

    copyShareLink() {
        const url = this.getShareUrl();
        navigator.clipboard.writeText(url).then(() => {
            this._showToast(TRANSLATIONS[this.currentLang].copied);
            if (window.soundEngine) window.soundEngine.playClick();
        }).catch(() => {
            prompt("Share Link:", url);
        });
    }

    openQRModal() {
        const modal = document.getElementById('qr-modal');
        modal.classList.remove('hidden');

        const shareUrl = this.getShareUrl();
        document.getElementById('qr-share-url-text').value = shareUrl;

        // Render QR Code
        const canvas = document.getElementById('qr-canvas');
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(canvas, shareUrl, {
                width: 220,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            });
        }
        if (window.soundEngine) window.soundEngine.playClick();
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        if (window.soundEngine) window.soundEngine.playClick();
    }

    /* ============================================================
       GOOGLE MAPS API SETTINGS & KEY MANAGEMENT
       ============================================================ */
    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('hidden');

        document.getElementById('settings-user-name').value = this.userProfile.name;
        const currentKey = localStorage.getItem(CONFIG.STORAGE_KEYS.GOOGLE_API_KEY) || '';
        document.getElementById('google-api-key-input').value = currentKey;

        if (window.soundEngine) window.soundEngine.playClick();
    }

    async saveSettings() {
        const newName = document.getElementById('settings-user-name').value.trim();
        if (newName) {
            this.userProfile.name = newName;
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, newName);
            document.getElementById('my-name-display').textContent = newName;
        }

        const newKey = document.getElementById('google-api-key-input').value.trim();
        localStorage.setItem(CONFIG.STORAGE_KEYS.GOOGLE_API_KEY, newKey);

        if (newKey && newKey.length > 10) {
            this._showToast(this.currentLang === 'km' ? '🔄 កំពុងផ្ទុក Google Maps API...' : '🔄 Loading Google Maps API...');
            const status = await this.mapManager.init(newKey);
            this._updateProviderUI(status);
            if (status === 'google') {
                this._showToast(this.currentLang === 'km' ? '✅ Google Maps បានដំណើរការជោគជ័យ!' : '✅ Google Maps activated successfully!');
            }
        }

        this._broadcastMyLocation();
        this._updateMyMarker();
        this._renderRosterList();
        this.closeModal('settings-modal');
    }

    _updateProviderUI(providerStatus) {
        const badge = document.getElementById('map-provider-badge');
        if (providerStatus === 'google') {
            badge.className = 'badge google-badge';
            badge.textContent = 'Google Maps Official';
        } else {
            badge.className = 'badge preview-badge';
            badge.textContent = 'Preview Map Engine';
        }
    }

    /* ============================================================
       LANGUAGE LOCALIZATION
       ============================================================ */
    toggleLanguage() {
        this.currentLang = this.currentLang === 'km' ? 'en' : 'km';
        localStorage.setItem(CONFIG.STORAGE_KEYS.LANGUAGE, this.currentLang);
        this._applyTranslations();
        this._renderRosterList();
        if (window.soundEngine) window.soundEngine.playClick();
    }

    _applyTranslations() {
        const t = TRANSLATIONS[this.currentLang];
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
            const key = el.getAttribute('data-i18n-ph');
            if (t[key]) {
                el.placeholder = t[key];
            }
        });

        document.getElementById('lang-toggle-btn').textContent = this.currentLang === 'km' ? 'EN' : 'ខ្មែរ';
    }

    /* ============================================================
       AVATAR & COLOR PICKERS
       ============================================================ */
    _renderAvatarAndColorPickers() {
        // Avatars
        const avatarContainer = document.getElementById('avatar-picker-grid');
        avatarContainer.innerHTML = '';
        CONFIG.AVATARS.forEach((av) => {
            const div = document.createElement('div');
            div.className = `avatar-option-card ${this.userProfile.avatar === av.icon ? 'selected' : ''}`;
            div.innerHTML = `<span class="emoji">${av.icon}</span>`;
            div.title = av.name;
            div.addEventListener('click', () => {
                this.userProfile.avatar = av.icon;
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_AVATAR, av.icon);
                document.getElementById('my-avatar-display').textContent = av.icon;
                document.querySelectorAll('.avatar-option-card').forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
                this._updateMyMarker();
                this._broadcastMyLocation();
                this._renderRosterList();
            });
            avatarContainer.appendChild(div);
        });

        // Colors
        const colorContainer = document.getElementById('color-picker-grid');
        colorContainer.innerHTML = '';
        CONFIG.COLORS.forEach((col) => {
            const div = document.createElement('div');
            div.className = `color-option-card ${this.userProfile.color === col.hex ? 'selected' : ''}`;
            div.style.background = col.hex;
            div.title = col.name;
            div.addEventListener('click', () => {
                this.userProfile.color = col.hex;
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_COLOR, col.hex);
                document.querySelectorAll('.color-option-card').forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
                this._updateMyMarker();
                this._broadcastMyLocation();
                this._renderRosterList();
            });
            colorContainer.appendChild(div);
        });
    }

    /* ============================================================
       EVENT BINDINGS & UI CONTROLS
       ============================================================ */
    _bindEventListeners() {
        // Center on Me
        document.getElementById('recenter-me-btn').addEventListener('click', () => {
            this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng, 16);
            if (window.soundEngine) window.soundEngine.playClick();
        });

        // Auto-Follow Toggle
        const autoFollowBtn = document.getElementById('auto-follow-btn');
        if (autoFollowBtn) {
            autoFollowBtn.addEventListener('click', () => {
                this.isAutoFollow = !this.isAutoFollow;
                autoFollowBtn.classList.toggle('active', this.isAutoFollow);
                if (this.isAutoFollow) {
                    this.mapManager.panTo(this.myLocation.lat, this.myLocation.lng);
                    this._showToast(this.currentLang === 'km' ? '🧭 បានបើកតាមដានទីតាំងខ្ញុំជាប់!' : '🧭 Auto-Follow activated!');
                } else {
                    this._showToast(this.currentLang === 'km' ? '🖐️ បានបិទតាមដាន (អាចរំកិលផែនទីដោយសេរី)' : '🖐️ Auto-Follow paused');
                }
                if (window.soundEngine) window.soundEngine.playClick();
            });
        }

        // Fit All
        document.getElementById('fit-all-btn').addEventListener('click', () => {
            this.mapManager.fitAllMarkers();
            if (window.soundEngine) window.soundEngine.playClick();
        });

        // Share Buttons
        document.getElementById('share-btn').addEventListener('click', () => this.openQRModal());
        document.getElementById('copy-room-btn').addEventListener('click', () => this.copyShareLink());

        // SOS Button
        document.getElementById('sos-btn').addEventListener('click', () => this.toggleSOS());

        // Simulation Buttons
        document.getElementById('simulate-self-btn').addEventListener('click', () => this.toggleSelfSimulation());
        document.getElementById('companion-toggle').addEventListener('change', () => this.toggleCompanionSimulation());

        // Settings Modal
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());

        // Audio Mute Toggle
        const audioBtn = document.getElementById('audio-toggle-btn');
        audioBtn.addEventListener('click', () => {
            const isMuted = !window.soundEngine.isMuted;
            window.soundEngine.setMuted(isMuted);
            audioBtn.classList.toggle('muted', isMuted);
            audioBtn.innerHTML = isMuted ? '<i data-lucide="volume-x"></i>' : '<i data-lucide="volume-2"></i>';
            if (window.lucide) window.lucide.createIcons();
        });

        // Map Style Dropdown
        document.getElementById('map-style-select').addEventListener('change', (e) => {
            this.mapManager.updateMapTiles(e.target.value);
            if (window.soundEngine) window.soundEngine.playClick();
        });

        // Mobile Drawer Toggle
        const drawerToggle = document.getElementById('drawer-toggle-btn');
        if (drawerToggle) {
            drawerToggle.addEventListener('click', () => {
                document.getElementById('sidebar-drawer').classList.toggle('open');
            });
        }
    }

    _showToast(msg, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), duration);
    }

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
