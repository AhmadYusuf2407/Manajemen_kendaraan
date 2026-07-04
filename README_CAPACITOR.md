Capacitor Android Packaging Instructions

1) Install Capacitor core and CLI

```bash
npm install @capacitor/core @capacitor/cli --save
```

2) Initialize Capacitor (if you haven't already)

```bash
npx cap init "Manajemen Kendaraan" com.example.manajemenkendaraan --web-dir=public
```

3) Add Android platform

```bash
npm run cap:add-android
```

4) Build your web app (ensure `public/` contains the production build)

```bash
# If using server-rendered Express, ensure static files are in `public/`.
# For a client build step, copy assets to public/ before the next step.
```

5) Sync web assets to native project

```bash
npm run cap:copy
npm run cap:sync
```

6) Open Android Studio and build the APK

```bash
npm run cap:open-android
```

Notes:
- Ensure Android SDK and JDK are installed and `ANDROID_HOME`/`JAVA_HOME` are set.
- For production, set `start_url` and manifest appropriately and verify Service Worker registration.
