import { allowedCharactersRegex } from '@src/poc/constants';

const nodeId = 'plain-js-input';
let buffers = [Buffer.from('', 'utf8')];

export const addPlainJsInput = () => {
  setTimeout(() => {
    const node = document.querySelector(`#${nodeId}`);

    const header = document.createElement('h4');
    header.style.margin = '10px 0 0';
    header.textContent = 'fake - plain js';
    node.append(header);

    const input = document.createElement('input');
    input.addEventListener('keydown', (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!allowedCharactersRegex.test(event.key)) return;

      buffers = [Buffer.concat([buffers[0], Buffer.from(event.key)].filter(Boolean)), ...buffers];
    });
    node.append(input);

    const showButton = document.createElement('button');
    showButton.textContent = 'show';
    showButton.addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      alert(String.fromCharCode(...buffers[0]));
    });
    node.append(showButton);

    // eslint-disable-next-line no-magic-numbers
  }, 1000);
};
