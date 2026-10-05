# កម្មវិធីតាមដានទីតាំងផ្ទាល់ (Live Real-Time Location Tracker)

កម្មវិធីតាមដានទីតាំងផ្ទាល់ (Real-Time GPS Tracking Web Application) ជាមួយរូបរាងទំនើប (Modern Glassmorphism HUD), ដំណើរការរលូន (Responsive), និងគាំទ្រ **Google Maps JavaScript API** ព្រមទាំងការចែករំលែកទីតាំងគ្នាទៅវិញទៅមក (Mutual Live Tracking)។

---

## 🌟 លក្ខណៈពិសេសចម្បង (Key Features)

1. **ការតាមដានទីតាំងគ្នាទៅវិញទៅមក Real-Time (Mutual Live Tracking)**:
   - អ្នកប្រើប្រាស់អាចបង្កើត ឬចូលទៅកាន់បន្ទប់តាមដាន (Room ID ឧ. `TRACK-8899`)។
   - ចែករំលែកតំណភ្ជាប់ (Share Link) ឬបង្ហាញ **QR Code** ដើម្បីឱ្យទូរស័ព្ទដៃស្កេនចូលរួមបានភ្លាមៗ។
   - បង្ហាញទីតាំងមិត្តភក្តិ ឬសមាជិកទាំងអស់នៅលើផែនទីដោយផ្ទាល់ (Real-Time) តាមរយៈ **MQTT WebSockets** និង **BroadcastChannel** (អាចបើក Tab ២ នៅលើកុំព្យូទ័រតែមួយដើម្បីសាកល្បងបាន)។

2. **ការតភ្ជាប់ជាមួយ Google Maps API (Google Maps Integration)**:
   - គាំទ្រ Google Maps JavaScript API ផ្លូវការ (Roadmap, Satellite Hybrid, Night/Dark Mode, Terrain)។
   - មានផ្ទាំង **ការកំណត់ (Settings)** ងាយស្រួលបិទភ្ជាប់ Google Maps API Key របស់លោកអ្នក រួចចុច Save នោះផែនទីនឹងប្តូរទៅ Google Maps ភ្លាមៗ។
   - **ប្រព័ន្ធការពារ Smart Fallback**: ប្រសិនបើមិនទាន់បានបញ្ចូល Google Maps API Key កម្មវិធីនៅតែដំណើរការផែនទីបានយ៉ាងស្អាតដោយគ្មាន Error។

3. **គណនាចម្ងាយ និងរយៈពេលមកដល់ (Distance & ETA Calculation)**:
   - ចុចលើសមាជិកណាម្នាក់នៅក្នុងបញ្ជី ឬលើផែនទី វានឹងគូសខ្សែបន្ទាត់តភ្ជាប់ (Dynamic Route Line)។
   - បង្ហាញចម្ងាយផ្ទាល់ (ឧ. `1.85 km`), ល្បឿនធ្វើដំណើរ (`km/h`), និងរយៈពេលប៉ាន់ស្មាននៃការមកដល់ (ETA ឧ. `4 min`)។

4. **ប្រព័ន្ធសាកល្បងចលនា (Simulation & Virtual Friend Mode)**:
   - **បើកមិត្តភក្តិសាកល្បង (Dara 🛵)**: បង្កើតតួអង្គបើកម៉ូតូសាកល្បងនៅលើមហាវិថីនានាក្នុងរាជធានីភ្នំពេញ (វិមានឯករាជ្យ, ព្រះបរមរាជវាំង, មាត់ទន្លេ, កោះពេជ្រ)។
   - **សាកល្បងចលនាខ្លួនឯង (Drive Simulation)**: ចុចប៊ូតុង "សាកល្បងចលនា" ដើម្បីមើលការផ្លាស់ប្តូរល្បឿន និងទិសដៅ។
   - **Click to Move**: ចុចលើចំណុចណាមួយលើផែនទីដើម្បីប្តូរទីតាំងសាកល្បងភ្លាមៗ។

5. **សញ្ញាអាសន្នបន្ទាន់ (SOS Emergency Alert)**:
   - ប៊ូតុង SOS បញ្ជូនសញ្ញាអាសន្នពណ៌ក្រហម (Strobe Alert) ព្រមទាំងសំឡេង Siren ទៅកាន់គ្រប់គ្នាក្នុងបន្ទប់ជាមួយកូអរដោនេ GPS ច្បាស់លាស់។

6. **រូបរាងឡូយ និងគាំទ្រ ២ ភាសា (Ultra-Sleek & Bilingual)**:
   - រចនាបទ Cyber Dark Glassmorphism ជាមួយ Glowing Radar Beacons។
   - ប្តូរភាសាខ្មែរ (KM) និងភាសាអង់គ្លេស (EN) ដោយចុចតែម្តង។
   - អាចដំណើរការបានគ្រប់ទំហំអេក្រង់ (Mobile Responsive ជាមួយ Bottom Drawer)។

---

## 🚀 របៀបបើកដំណើរការ (How to Run)

Server ត្រូវបានបើកដំណើរការរួចរាល់នៅលើម៉ាស៊ីនរបស់អ្នក:
- **Local URL**: [http://localhost:3000](http://localhost:3000)

ដើម្បីបើកដំណើរការឡើងវិញនៅពេលក្រោយ គ្រាន់តែដំណើរការ:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 3000
```
ឬបើកឯកសារ `index.html` ជាមួយ Browser ណាមួយក៏បាន!
