/**
 * Global Configuration and Language Localization
 * Real-Time Location Tracker
 */

const CONFIG = {
    // Default location (Phnom Penh Central Coordinates)
    DEFAULT_COORDS: {
        lat: 11.5564,
        lng: 104.9282,
        zoom: 14
    },
    
    // Public MQTT Brokers for Real-Time Cross-Device WebSocket Sync
    MQTT_BROKERS: [
        'wss://broker.emqx.io:8084/mqtt',
        'wss://broker.hivemq.com:8884/mqtt',
        'wss://test.mosquitto.org:8081'
    ],
    MQTT_TOPIC_PREFIX: 'realtime_gps_tracker_cambodia_v1/',
    
    // Broadcast Channel for Instant Multi-Tab Sync on the Same Device
    BROADCAST_CHANNEL_NAME: 'live_map_tracking_channel',
    
    // Storage Keys
    STORAGE_KEYS: {
        GOOGLE_API_KEY: 'tracker_google_maps_api_key',
        USER_NAME: 'tracker_user_name',
        USER_AVATAR: 'tracker_user_avatar',
        USER_COLOR: 'tracker_user_color',
        ROOM_ID: 'tracker_room_id',
        LANGUAGE: 'tracker_language',
        MAP_TYPE: 'tracker_map_type',
        AUDIO_MUTED: 'tracker_audio_muted',
        MAP_PROVIDER: 'tracker_map_provider' // 'google' or 'fallback'
    },

    // Avatar Presets
    AVATARS: [
        { id: 'car', icon: '🚗', name: 'Car / ឡាន' },
        { id: 'moto', icon: '🛵', name: 'Motorbike / ម៉ូតូ' },
        { id: 'person', icon: '🚶‍♂️', name: 'Walking / ថ្មើរជើង' },
        { id: 'bicycle', icon: '🚲', name: 'Bicycle / កង់' },
        { id: 'truck', icon: '🚚', name: 'Truck / ឡានដឹក' },
        { id: 'runner', icon: '🏃‍♀️', name: 'Runner / រត់' }
    ],

    // Color Palette for User Beacons
    COLORS: [
        { name: 'Neon Cyan', hex: '#00f2fe', glow: 'rgba(0, 242, 254, 0.6)' },
        { name: 'Emerald Green', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' },
        { name: 'Vibrant Amber', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)' },
        { name: 'Electric Purple', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
        { name: 'Rose Pink', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)' },
        { name: 'Sunset Orange', hex: '#f97316', glow: 'rgba(249, 115, 22, 0.6)' }
    ]
};

// Bilingual Strings (Khmer & English)
const TRANSLATIONS = {
    km: {
        app_title: "កម្មវិធីតាមដានទីតាំងផ្ទាល់",
        app_subtitle: "Real-Time GPS Location Tracking",
        live_status: "ផ្សាយផ្ទាល់",
        offline_status: "ក្រៅបណ្តាញ",
        connecting: "កំពុងភ្ជាប់...",
        room_label: "បន្ទប់តាមដាន:",
        copy_room: "ចម្លងលេខបន្ទប់",
        copied: "បានចម្លងរួចរាល់!",
        share_btn: "ចែករំលែកតំណភ្ជាប់",
        members_count: "អ្នកចូលរួម",
        my_location: "ទីតាំងរបស់ខ្ញុំ",
        accuracy: "ភាពសុក្រឹត",
        speed: "ល្បឿន",
        distance: "ចម្ងាយ",
        eta: "រយៈពេលមកដល់",
        bearing: "ទិសដៅ",
        kmh: "គ.ម/ម៉ោង",
        meters: "ម៉ែត្រ",
        km: "គីឡូម៉ែត្រ",
        minutes: "នាទី",
        sos_btn: "អាសន្ន SOS",
        sos_active: "🚨 សញ្ញាអាសន្នត្រូវបានផ្ញើ!",
        map_layers: "ស្រទាប់ផែនទី",
        settings: "ការកំណត់",
        google_api_key: "Google Maps API Key",
        google_api_desc: "បញ្ចូល Google Maps API Key របស់អ្នកដើម្បីបើកដំណើរការ Google Maps ផ្ទាល់ពេញលេញ។",
        google_key_placeholder: "បិទភ្ជាប់ Google Maps API Key នៅទីនេះ...",
        save_btn: "រក្សាទុក",
        cancel_btn: "បោះបង់",
        active_users: "អ្នកកំពុងតាមដានផ្ទាល់",
        no_users: "មិនទាន់មានអ្នកដទៃចូលរួមនៅឡើយទេ",
        share_prompt: "សូមផ្ញើតំណភ្ជាប់នេះទៅមិត្តភក្តិដើម្បីតាមដានទីតាំងគ្នាទៅវិញទៅមក!",
        scan_qr: "ស្កេន QR Code ជាមួយទូរស័ព្ទ",
        simulate_btn: "សាកល្បងចលនា (Simulation)",
        stop_simulate: "បញ្ឈប់សាកល្បង",
        drive_companion: "បើកមិត្តភក្តិសាកល្បង (Dara)",
        enter_name: "ឈ្មោះរបស់អ្នក",
        choose_avatar: "ជ្រើសរើសរូបតំណាង",
        choose_color: "ពណ៌សម្គាល់",
        google_map_mode: "Google Maps ផ្ទាល់",
        satellite_mode: "ទិដ្ឋភាពផ្កាយរណប (Satellite)",
        dark_mode: "ទម្រង់រាត្រី (Dark Mode)",
        terrain_mode: "ទម្រង់ដីកម្ពស់ (Terrain)",
        focus_user: "មើលទីតាំង",
        you_badge: "អ្នក (You)",
        idle: "នៅនឹងមួយកន្លែង",
        moving: "កំពុងធ្វើដំណើរ",
        battery: "ថ្ម",
        last_seen: "ទើបតែធ្វើបច្ចុប្បន្នភាព",
        join_room: "ចូលបន្ទប់",
        new_room: "បង្កើតបន្ទប់ថ្មី",
        click_map_teleport: "💡 ជំនួយ: អ្នកអាចចុចលើផែនទីដើម្បីផ្លាស់ប្តូរទីតាំងសាកល្បងបាន!",
        follow_me: "តាមដានខ្ញុំជាប់",
        request_peer_location: "ស្នើសុំទីតាំងបច្ចុប្បន្ន",
        gps_locked: "✅ ចាប់បាន GPS ផ្ទាល់ជោគជ័យ!",
        gps_failed: "⚠️ មិនអាចចាប់ GPS បាន! សូមពិនិត្យ Permission លើ Device",
        request_sent: "📡 បានផ្ញើសំណើសុំទីតាំងទៅកាន់ Device នោះរួចរាល់!"
    },
    en: {
        app_title: "Live GPS Tracker",
        app_subtitle: "Mutual Real-Time Location Sharing",
        live_status: "LIVE RADAR",
        offline_status: "OFFLINE",
        connecting: "CONNECTING...",
        room_label: "Tracking Room:",
        copy_room: "Copy Code",
        copied: "Copied to clipboard!",
        share_btn: "Share Link",
        members_count: "Members",
        my_location: "My Location",
        accuracy: "Accuracy",
        speed: "Speed",
        distance: "Distance",
        eta: "Est. Arrival",
        bearing: "Heading",
        kmh: "km/h",
        meters: "m",
        km: "km",
        minutes: "mins",
        sos_btn: "Emergency SOS",
        sos_active: "🚨 EMERGENCY ALERT BROADCASTED!",
        map_layers: "Map Style",
        settings: "Settings",
        google_api_key: "Google Maps API Key",
        google_api_desc: "Enter your Google Maps API Key to unlock full native Google Maps with Traffic & Satellite.",
        google_key_placeholder: "Paste your Google Maps API key here...",
        save_btn: "Save & Apply",
        cancel_btn: "Cancel",
        active_users: "Active Participants",
        no_users: "Waiting for other participants to join...",
        share_prompt: "Share this link or QR code with someone to track each other's live location!",
        scan_qr: "Scan QR Code on Phone",
        simulate_btn: "Simulate Movement",
        stop_simulate: "Stop Simulation",
        drive_companion: "Add Virtual Friend (Dara)",
        enter_name: "Your Display Name",
        choose_avatar: "Vehicle / Icon",
        choose_color: "Beacon Color",
        google_map_mode: "Google Maps Clean",
        satellite_mode: "Satellite Hybrid",
        dark_mode: "Cyber Dark Style",
        terrain_mode: "Terrain View",
        focus_user: "Focus View",
        you_badge: "You",
        idle: "Stationary",
        moving: "Moving",
        battery: "Battery",
        last_seen: "Just updated",
        join_room: "Join Room",
        new_room: "Create New Room",
        click_map_teleport: "💡 Tip: Click anywhere on the map to manually move your test location!",
        follow_me: "Auto-Follow",
        request_peer_location: "Request Location",
        gps_locked: "✅ Live GPS Locked Successfully!",
        gps_failed: "⚠️ Could not acquire GPS. Check device permissions.",
        request_sent: "📡 Location request ping transmitted to device!"
    }
};
