/**
 * Virtual Simulator & Waypoint Pathfinder
 * Simulates realistic vehicle movements in Phnom Penh for instant testing and demonstration
 */

class RouteSimulator {
    constructor() {
        // Pre-mapped realistic coordinates along Phnom Penh major boulevards
        // (Norodom Blvd -> Independence Monument -> Riverside Sisowath Quay -> Koh Pich)
        this.phnomPenhPath = [
            { lat: 11.5564, lng: 104.9282 }, // Independence Monument
            { lat: 11.5585, lng: 104.9285 },
            { lat: 11.5620, lng: 104.9310 }, // Royal Palace Area
            { lat: 11.5655, lng: 104.9332 }, // Riverside Sisowath
            { lat: 11.5700, lng: 104.9325 }, // Night Market
            { lat: 11.5725, lng: 104.9270 }, // Wat Phnom
            { lat: 11.5680, lng: 104.9220 }, // Central Market (Phsar Thmey)
            { lat: 11.5610, lng: 104.9215 }, // Monivong Blvd
            { lat: 11.5540, lng: 104.9225 }, // Olympic Stadium Junction
            { lat: 11.5480, lng: 104.9300 }, // BKK1 Area
            { lat: 11.5505, lng: 104.9380 }, // Koh Pich Bridge
            { lat: 11.5535, lng: 104.9415 }  // Koh Pich Diamond Island
        ];

        this.companionInterval = null;
        this.selfSimInterval = null;
        this.companionIndex = 0;
        this.companionProgress = 0; // 0 to 1 between waypoints
        this.selfIndex = 4;
        this.selfProgress = 0;

        this.companionData = {
            id: 'sim_companion_dara',
            name: 'តារា (Dara) 🛵',
            avatar: '🛵',
            color: '#10b981',
            lat: 11.5564,
            lng: 104.9282,
            speed: 38,
            heading: 45,
            accuracy: 8,
            battery: 88,
            isSOS: false
        };
    }

    startCompanion(onUpdateCallback) {
        if (this.companionInterval) return;

        this.companionInterval = setInterval(() => {
            const p1 = this.phnomPenhPath[this.companionIndex];
            const nextIdx = (this.companionIndex + 1) % this.phnomPenhPath.length;
            const p2 = this.phnomPenhPath[nextIdx];

            this.companionProgress += 0.08;
            if (this.companionProgress >= 1) {
                this.companionProgress = 0;
                this.companionIndex = nextIdx;
            }

            // Interpolate coordinate
            const lat = p1.lat + (p2.lat - p1.lat) * this.companionProgress;
            const lng = p1.lng + (p2.lng - p1.lng) * this.companionProgress;

            // Calculate bearing
            const heading = this.calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
            const speed = Math.round(32 + Math.sin(Date.now() / 3000) * 12); // 20 - 44 km/h realistic variance

            this.companionData.lat = lat;
            this.companionData.lng = lng;
            this.companionData.heading = heading;
            this.companionData.speed = speed;

            onUpdateCallback(this.companionData);
        }, 1500);
    }

    stopCompanion() {
        if (this.companionInterval) {
            clearInterval(this.companionInterval);
            this.companionInterval = null;
        }
    }

    startSelfSimulation(onUpdateCallback) {
        if (this.selfSimInterval) return;

        this.selfSimInterval = setInterval(() => {
            const p1 = this.phnomPenhPath[this.selfIndex];
            const nextIdx = (this.selfIndex + 1) % this.phnomPenhPath.length;
            const p2 = this.phnomPenhPath[nextIdx];

            this.selfProgress += 0.06;
            if (this.selfProgress >= 1) {
                this.selfProgress = 0;
                this.selfIndex = nextIdx;
            }

            const lat = p1.lat + (p2.lat - p1.lat) * this.selfProgress;
            const lng = p1.lng + (p2.lng - p1.lng) * this.selfProgress;
            const heading = this.calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
            const speed = Math.round(28 + Math.cos(Date.now() / 2500) * 10);

            onUpdateCallback({
                lat,
                lng,
                heading,
                speed,
                accuracy: 6
            });
        }, 1200);
    }

    stopSelfSimulation() {
        if (this.selfSimInterval) {
            clearInterval(this.selfSimInterval);
            this.selfSimInterval = null;
        }
    }

    // Great circle bearing calculation in degrees (0 - 360)
    calculateBearing(startLat, startLng, destLat, destLng) {
        const startLatRad = this.toRadians(startLat);
        const startLngRad = this.toRadians(startLng);
        const destLatRad = this.toRadians(destLat);
        const destLngRad = this.toRadians(destLng);

        const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
        const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
                  Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

        let brng = Math.atan2(y, x);
        brng = this.toDegrees(brng);
        return (brng + 360) % 360;
    }

    // Haversine distance in meters
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lon2 - lon1);

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    toDegrees(radians) {
        return radians * (180 / Math.PI);
    }
}

window.routeSimulator = new RouteSimulator();
