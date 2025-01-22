import React from 'react';

import { Box } from '@chakra-ui/react';

import { avatarToImage } from '../../../api/extension';

const AvatarLoader = ({
  avatar,
  width,
  smallRobot,
}: Readonly<{ avatar?: string; width: string; smallRobot?: boolean }>) => {
  const [loaded, setLoaded] = React.useState('');

  const fetchAvatar = async () => {
    if (!avatar || avatar === loaded) return;
    setLoaded(Number(avatar) ? avatarToImage(avatar) : avatar);
  };

  React.useEffect(() => {
    fetchAvatar();
  }, [avatar]);
  return (
    <Box
      width={Number(avatar) && smallRobot ? '85%' : width}
      height={Number(avatar) && smallRobot ? '85%' : width}
      rounded={'full'}
      overflow={'hidden'}
      backgroundImage={loaded ? `url(${loaded})` : 'none'}
      backgroundRepeat={'no-repeat'}
      backgroundSize={'cover'}
    />
  );
};

export default AvatarLoader;
