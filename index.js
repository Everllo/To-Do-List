const addForm = document.getElementById('addForm');
const itemInput = document.getElementById('itemInput');
const itemList = document.getElementById('itemList');

function createListItem(text) {
  const li = document.createElement('li');

  const span = document.createElement('span');
  span.textContent = text;
  span.title = "Нажмите, чтобы редактировать";
  li.appendChild(span);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const editBtn = document.createElement('button');
  editBtn.innerHTML = '✏️';
  editBtn.className = 'btn edit-btn';
  editBtn.title = 'Редактировать';
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.className = 'btn delete-btn';
  deleteBtn.title = 'Удалить';
  actions.appendChild(deleteBtn);

  li.appendChild(actions);

  // Удаление элемента
  deleteBtn.addEventListener('click', () => {
    li.remove();
  });

  // Редактирование
  editBtn.addEventListener('click', () => {
    if (li.classList.contains('editing')) return; // не открывать повторно

    li.classList.add('editing');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = span.textContent;
    li.insertBefore(input, span);
    li.removeChild(span);
    input.focus();

    function finishEditing() {
      const newValue = input.value.trim();
      if (newValue.length === 0) {
        li.remove();
        return;
      }
      span.textContent = newValue;
      li.insertBefore(span, input);
      li.removeChild(input);
      li.classList.remove('editing');
    }

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        li.insertBefore(span, input);
        li.removeChild(input);
        li.classList.remove('editing');
      }
    });
  });

  return li;
}

addForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = itemInput.value.trim();
  if (text.length === 0) return;

  const listItem = createListItem(text);
  itemList.appendChild(listItem);

  itemInput.value = '';
  itemInput.focus();
});
