import { allowedCharactersRegex } from '@src/poc/constants';

const nodeId = 'plain-js-input';
const initialValueBuffer = [Buffer.from('', 'utf8')];
let buffers = initialValueBuffer;

export const addPlainJsInput = () => {
  const containerNode = document.querySelector(`#${nodeId}`);

  const header = document.createElement('h4');
  header.style.margin = '10px 0 0';
  header.textContent = 'fake - plain js';
  containerNode.append(header);

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = (event.currentTarget as HTMLFormElement).elements[0] as HTMLInputElement;
    input.value = '';
    buffers = initialValueBuffer;
  });
  containerNode.append(form);

  const input = document.createElement('input');
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Backspace') {
      if (buffers[0].length === 0) return;

      buffers = buffers.slice(1);
      input.value = input.value.slice(1);
      return;
    }
    if (!allowedCharactersRegex.test(event.key)) return;

    buffers = [Buffer.concat([buffers[0], Buffer.from(event.key)].filter(Boolean)), ...buffers];
    input.value = `${input.value}*`;
  });
  form.append(input);

  const submitButton = document.createElement('button');
  submitButton.textContent = 'submit';
  form.append(submitButton);

  // const showButton = document.createElement('button');
  // showButton.textContent = 'show';
  // showButton.addEventListener('click', () => {
  //   // eslint-disable-next-line no-alert
  //   alert(String.fromCharCode(...buffers[0]));
  // });
  // containerNode.append(showButton);
};
