import { useHistory } from 'react-router';
import { ERoutes } from '../../routes/enum';

const SPLASH_SCREEN_VIEWED_KEY = 'splashScreenViewedKey';

const setSplashScreenViewed = () => {
  localStorage.setItem(SPLASH_SCREEN_VIEWED_KEY, String(true));
};

type UseShowSplashScreenOutput = {
  handleRedirect: () => void;
  setSplashScreenViewed: () => void;
};
const useShowSplashScreen = (): UseShowSplashScreenOutput => {
  const history = useHistory();

  const handleRedirect = () => {
    if (localStorage.getItem(SPLASH_SCREEN_VIEWED_KEY)) {
      history.push(ERoutes.ROOT_ROUTE);
    }
  };

  return { handleRedirect, setSplashScreenViewed };
};

export { useShowSplashScreen };
