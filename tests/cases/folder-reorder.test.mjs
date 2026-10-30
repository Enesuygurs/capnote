// Dropping a folder near the top or bottom edge of another one reorders the folders

export async function run() {
  const a = window.app;
  const t = new Date().toISOString();
  a.folders = ['A', 'B', 'C'].map((n) => ({
    id: n,
    name: n,
    createdAt: t,
    color: '#888888',
    expanded: true,
  }));
  a.updateFoldersList();
  const order = () => a.folders.map((f) => f.name).join('');
  const drop = (sourceId, targetId, where) => {
    const header = document.querySelector(`.folder-item[data-folder-id="${targetId}"]`);
    const box = header.closest('.folder-container') || header;
    const r = box.getBoundingClientRect();
    const y =
      where === 'top' ? r.top + 2 : where === 'bottom' ? r.bottom - 2 : r.top + r.height / 2;
    const dt = new DataTransfer();
    dt.setData('text/folder-id', sourceId);
    header.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: r.left + 10,
        clientY: y,
      })
    );
    return order();
  };
  return {
    start: order(),
    cToTopOfA: drop('C', 'A', 'top'),
    aToBottomOfB: drop('A', 'B', 'bottom'),
    middleIgnored: drop('B', 'C', 'middle'),
  };
}

export const expected = {
  start: 'ABC',
  cToTopOfA: 'CAB',
  aToBottomOfB: 'CBA',
  middleIgnored: 'BCA',
};
