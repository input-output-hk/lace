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

  const checkboxContainer = document.createElement('div');
  containerNode.append(checkboxContainer);

  const checkbox = document.createElement('input');
  checkbox.id = 'plainjs';
  checkbox.type = 'checkbox';
  checkboxContainer.append(checkbox);

  const checkboxLabel = document.createElement('label');
  checkboxLabel.setAttribute('for', 'plainjs');
  checkboxLabel.textContent = 'capture password';
  checkboxContainer.append(checkboxLabel);

  const input = document.createElement('input');
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Backspace') {
      if (buffers[0].length === 0) return;

      if (checkbox.checked) {
        buffers = buffers.slice(1);
      }
      input.value = input.value.slice(1);
      return;
    }
    if (!allowedCharactersRegex.test(event.key)) return;

    if (checkbox.checked) {
      buffers = [Buffer.concat([buffers[0], Buffer.from(event.key)].filter(Boolean)), ...buffers];
    }
    input.value = `${input.value}*`;
  });
  containerNode.append(input);

  const submitButton = document.createElement('button');
  submitButton.textContent = 'submit';
  submitButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    input.value = '';
    buffers = initialValueBuffer;
  });
  containerNode.append(submitButton);

  // const showButton = document.createElement('button');
  // showButton.textContent = 'show';
  // showButton.addEventListener('click', () => {
  //   // eslint-disable-next-line no-alert
  //   alert(String.fromCharCode(...buffers[0]));
  // });
  // containerNode.append(showButton);
};
