# Expo Android Keyboard Fix
An Expo Config Plugin that fixes an issue with KeyboardAvoidingView on Android 15 (SDK 35), where the keyboard covers input fields in Expo/React Native apps.

## 🚨 Why do I need this plugin?
Starting from Android 15 (API 35), the existing adjustResize behavior no longer automatically resizes the app window when the keyboard appears. As a result, React Native's KeyboardAvoidingView may fail to keep inputs visible, causing the keyboard to overlay text fields.

This plugin resolves the issue by automatically injecting the necessary native Android code into your Expo app.

## 🔍 Related Issue
https://github.com/facebook/react-native/issues/49759


## 📦 Installation
```bash
npm install expo-android-keyboard-fix
# or
yarn add expo-android-keyboard-fix

```

## 🛠️ Usage
Add the plugin to your app.json or app.config.js:
```json
{
  "expo": {
    "plugins": [
      "expo-android-keyboard-fix"
    ]
  }
}


```

Then rebuild your Expo app:

```bash
npx expo prebuild --clean
# or using EAS Build
eas build -p android
```

## 📄 License
MIT