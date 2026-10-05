/**
 * Real-Time Tracker Network
 * Seamlessly handles MQTT WebSockets for cross-device sharing,
 * plus BroadcastChannel & LocalStorage for instant local multi-tab sync.
 */

class TrackerNetwork {
    constructor() {
        this.roomId = null;
        this.userId = this._getOrCreateUserId();
        this.mqttClient = null;
        this.broadcastChannel = null;
        this.isConnected = false;
        this.peers = new Map(); // peerId -> { data, lastSeen }
        this.onPeerUpdateCallback = null;
        this.onPeerLeaveCallback = null;
        this.onSOSCallback = null;
        this.onStatusChangeCallback = null;

        this._initBroadcastChannel();
        this._startStalePeerCleaner();
    }

    _getOrCreateUserId() {
        let id = sessionStorage.getItem('tracker_session_user_id');
        if (!id) {
            id = 'usr_' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem('tracker_session_user_id', id);
        }
        return id;
    }

    _initBroadcastChannel() {
        if ('BroadcastChannel' in window) {
            this.broadcastChannel = new BroadcastChannel(CONFIG.BROADCAST_CHANNEL_NAME);
            this.broadcastChannel.onmessage = (event) => {
                this._handleIncomingMessage(event.data);
            };
        }

        // LocalStorage fallback event for older browser engines
        window.addEventListener('storage', (e) => {
            if (e.key === 'tracker_cross_tab_sync' && e.newValue) {
                try {
                    const msg = JSON.parse(e.newValue);
                    this._handleIncomingMessage(msg);
                } catch (err) {
                    console.error("Storage sync parse error:", err);
                }
            }
        });
    }

    connect(roomId) {
        this.roomId = roomId.toUpperCase().trim();
        this._updateStatus('connecting');

        // Connect to public MQTT WebSocket Broker
        if (typeof mqtt !== 'undefined') {
            const brokerUrl = CONFIG.MQTT_BROKERS[0];
            const clientId = 'gps_user_' + this.userId + '_' + Math.random().toString(16).substring(2, 8);

            try {
                this.mqttClient = mqtt.connect(brokerUrl, {
                    clientId: clientId,
                    clean: true,
                    connectTimeout: 5000,
                    reconnectPeriod: 3000
                });

                this.mqttClient.on('connect', () => {
                    console.log(`[Network] Connected to MQTT Broker: ${brokerUrl}`);
                    this.isConnected = true;
                    this._updateStatus('online');

                    const topic = `${CONFIG.MQTT_TOPIC_PREFIX}${this.roomId}/#`;
                    this.mqttClient.subscribe(topic, (err) => {
                        if (err) console.error("Subscribe error:", err);
                    });

                    // Send Join Announcement
                    this.broadcastJoin();
                });

                this.mqttClient.on('message', (topic, message) => {
                    try {
                        const payload = JSON.parse(message.toString());
                        this._handleIncomingMessage(payload);
                    } catch (e) {
                        console.error("Failed to parse MQTT message:", e);
                    }
                });

                this.mqttClient.on('error', (err) => {
                    console.warn("[Network] MQTT connection warning:", err);
                    this._updateStatus('local_only');
                });

                this.mqttClient.on('close', () => {
                    this.isConnected = false;
                    this._updateStatus('offline');
                });
            } catch (err) {
                console.warn("MQTT init error, using BroadcastChannel sync:", err);
                this._updateStatus('local_only');
            }
        } else {
            console.warn("MQTT library not loaded; operating in local sync mode.");
            this._updateStatus('local_only');
        }

        // Also broadcast join locally
        this.broadcastJoin();
    }

    disconnect() {
        if (this.mqttClient) {
            this.broadcastLeave();
            this.mqttClient.end();
            this.mqttClient = null;
        }
        this.isConnected = false;
        this._updateStatus('offline');
    }

    broadcastLocation(locationData) {
        const payload = {
            type: 'location',
            roomId: this.roomId,
            senderId: this.userId,
            data: {
                id: this.userId,
                name: locationData.name || 'Anonymous',
                avatar: locationData.avatar || '🚗',
                color: locationData.color || '#00f2fe',
                lat: locationData.lat,
                lng: locationData.lng,
                speed: locationData.speed || 0,
                heading: locationData.heading || 0,
                accuracy: locationData.accuracy || 10,
                battery: locationData.battery || 100,
                isSOS: locationData.isSOS || false,
                timestamp: Date.now()
            }
        };

        this._transmit(payload);
    }

    broadcastJoin() {
        const payload = {
            type: 'join',
            roomId: this.roomId,
            senderId: this.userId,
            timestamp: Date.now()
        };
        this._transmit(payload);
    }

    broadcastLeave() {
        const payload = {
            type: 'leave',
            roomId: this.roomId,
            senderId: this.userId,
            timestamp: Date.now()
        };
        this._transmit(payload);
    }

    broadcastSOS(locationData, active = true) {
        const payload = {
            type: 'sos',
            roomId: this.roomId,
            senderId: this.userId,
            active: active,
            data: locationData,
            timestamp: Date.now()
        };
        this._transmit(payload);
    }

    requestLocation(targetId = null) {
        const payload = {
            type: 'request_location',
            roomId: this.roomId,
            senderId: this.userId,
            targetId: targetId,
            timestamp: Date.now()
        };
        this._transmit(payload);
    }

    _transmit(payload) {
        // Transmit via MQTT
        if (this.mqttClient && this.mqttClient.connected) {
            const topic = `${CONFIG.MQTT_TOPIC_PREFIX}${this.roomId}/${payload.type}`;
            this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
        }

        // Transmit via BroadcastChannel (local tabs/windows)
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(payload);
        }

        // Transmit via LocalStorage trigger for multi-tab
        try {
            localStorage.setItem('tracker_cross_tab_sync', JSON.stringify({
                ...payload,
                _ts: Date.now() + Math.random()
            }));
        } catch (e) {
            // Ignore storage quota or disabled storage
        }
    }

    _handleIncomingMessage(msg) {
        if (!msg || msg.roomId !== this.roomId) return;
        if (msg.senderId === this.userId) return; // Don't process own echo

        switch (msg.type) {
            case 'location':
                if (msg.data) {
                    const peerId = msg.senderId;
                    this.peers.set(peerId, {
                        data: msg.data,
                        lastSeen: Date.now()
                    });

                    if (this.onPeerUpdateCallback) {
                        this.onPeerUpdateCallback(msg.data);
                    }
                }
                break;

            case 'request_location':
                // A peer device requested our location!
                if (!msg.targetId || msg.targetId === this.userId) {
                    window.dispatchEvent(new CustomEvent('request-my-location', { detail: { requesterId: msg.senderId } }));
                }
                break;

            case 'join':
                if (window.soundEngine) window.soundEngine.playJoin();
                // Respond with our current location so the new joiner sees us immediately
                window.dispatchEvent(new CustomEvent('new-peer-joined', { detail: { peerId: msg.senderId } }));
                break;

            case 'leave':
                this._removePeer(msg.senderId);
                break;

            case 'sos':
                if (this.onSOSCallback) {
                    this.onSOSCallback(msg);
                }
                break;
        }
    }

    _removePeer(peerId) {
        if (this.peers.has(peerId)) {
            this.peers.delete(peerId);
            if (this.onPeerLeaveCallback) {
                this.onPeerLeaveCallback(peerId);
            }
        }
    }

    _startStalePeerCleaner() {
        setInterval(() => {
            const now = Date.now();
            const STALE_TIMEOUT = 35000; // 35 seconds of silence = user disconnected

            this.peers.forEach((val, id) => {
                if (now - val.lastSeen > STALE_TIMEOUT) {
                    this._removePeer(id);
                }
            });
        }, 10000);
    }

    _updateStatus(status) {
        if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(status);
        }
    }

    getPeerCount() {
        return this.peers.size;
    }

    getPeersList() {
        const list = [];
        this.peers.forEach((val) => list.push(val.data));
        return list;
    }
}
