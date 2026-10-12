# Deploy My Love

## Website

1. Push the React app to `main`.
2. Open **Settings → Pages** and choose **GitHub Actions** as the source.
3. The Pages workflow publishes the build at:
   <https://codewithabhi004.github.io/Spotify-music-player/>

The app uses relative asset URLs and works from a GitHub Pages project subpath. Only the files in the repository are available on the public site. Audio files in `song/` are excluded from Git by default; website visitors can add audio files from their own device.

## Android APK

The **Build My Love Android APK** workflow runs on pushes to `main` and can also be started manually from **Actions**. Once it finishes successfully, download the APK from:

<https://github.com/codewithabhi004/Spotify-music-player/releases/latest/download/My-Love.apk>

The app includes the app UI and photos. Use **Add music** in the app to select music stored on the phone. Uploaded tracks stay on the phone and are not sent to the public site.

## Public media

The app repository is public. Do not make copyrighted songs or private photographs public without permission.
