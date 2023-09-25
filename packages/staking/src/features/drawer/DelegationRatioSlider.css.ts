import { style, sx } from '@lace/ui';

/*
.SliderRoot {
  position: relative;
  display: flex;
  align-items: center;
  user-select: none;
  touch-action: none;
  width: 200px;
  height: 20px;
}

.SliderTrack {
  background-color: var(--black-a10);
  position: relative;
  flex-grow: 1;
  border-radius: 9999px;
  height: 3px;
}

.SliderRange {
  position: absolute;
  background-color: white;
  border-radius: 9999px;
  height: 100%;
}

.SliderThumb {
  display: block;
  width: 20px;
  height: 20px;
  background-color: white;
  box-shadow: 0 2px 10px var(--black-a7);
  border-radius: 10px;
}
.SliderThumb:hover {
  background-color: var(--violet-3);
}
.SliderThumb:focus {
  outline: none;
  box-shadow: 0 0 0 5px var(--black-a8);
}
 */

export const SliderRoot = style([
  sx({
    height: '$20',
    width: '$214',
  }),
  {
    alignItems: 'center',
    display: 'flex',
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
  },
]);

export const SliderTrack = style([
  sx({
    borderRadius: '$full',
    height: '$2',
  }),
  {
    backgroundColor: 'red',
    flexGrow: 1,
    position: 'relative',
  },
]);

export const SliderRange = style([
  sx({
    borderRadius: '$full',
  }),
  {
    backgroundColor: 'blue',
    height: '100%',
    position: 'absolute',
  },
]);

export const SliderThumb = style([
  sx({
    borderRadius: '$full',
    height: '$20',
    width: '$20',
  }),
  {
    backgroundColor: 'yellow',
    boxShadow: '0 2px 10px var(--black-a7)',
    display: 'block',
  },
]);
