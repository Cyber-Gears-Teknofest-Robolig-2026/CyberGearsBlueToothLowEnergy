import { Platform } from 'react-native';

// Platform sınırı yalnızca BURADA. Android modülü native BLE (BleManager) içerdiği
// için web'de hiç değerlendirilmemeli; bu yüzden platforma göre TEMBEL (require)
// yüklüyoruz. require yalnızca ilgili platformda çağrıldığından, web'de android
// modül grafiği hiç çalışmaz ve diğer dosyaların Platform'a ihtiyacı kalmaz.
declare const require: (modulePath: string) => any;

const App =
  Platform.OS === 'web'
    ? require('./web/App').default
    : require('./android/App').default;

export default App;
