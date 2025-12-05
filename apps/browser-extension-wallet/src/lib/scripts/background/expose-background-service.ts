import { wallet$ } from './wallet';
import { exposeBackgroundService } from './services/utilityServices';

exposeBackgroundService(wallet$);
