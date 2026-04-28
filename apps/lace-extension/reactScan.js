import { scan, setOptions } from 'react-scan';

if (localStorage.getItem('react-scan-enabled') === 'true') {
  scan();
  setOptions({ enabled: false });
}
