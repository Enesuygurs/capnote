// Inserted images can be selected and resized

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Img';
  a.richEditor.focus();
  a.richEditor.innerHTML = '<p>before</p>';
  const r = document.createRange();
  r.selectNodeContents(a.richEditor.querySelector('p'));
  r.collapse(false);
  getSelection().removeAllRanges();
  getSelection().addRange(r);
  const src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  a.insertImageAtSelection(src, 'one.gif');
  a.insertImageAtSelection(src, 'two.gif');
  const wraps = a.richEditor.querySelectorAll('.img-wrap');
  // select then deselect by clicking elsewhere
  wraps[0].click();
  const selected = wraps[0].classList.contains('selected');
  document.body.click();
  const deselected = !wraps[0].classList.contains('selected');
  // resize via handle
  const img = wraps[0].querySelector('img');
  img.style.width = '100px';
  const handle = wraps[0].querySelector('.img-handle');
  handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }));
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 0 }));
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  return {
    wraps: wraps.length,
    handles: a.richEditor.querySelectorAll('.img-handle').length,
    selected,
    deselected,
    width: img.style.width,
    inParagraph: wraps[0].parentElement.tagName,
  };
}

export const expected = {
  wraps: 2,
  handles: 2,
  selected: true,
  deselected: true,
  width: '150px',
  inParagraph: 'P',
};
