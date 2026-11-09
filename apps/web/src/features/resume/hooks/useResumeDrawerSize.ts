import { useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";

export const useResumeDrawerSize = (dialog: RefObject<HTMLDialogElement>) => {
  const [expanded, setExpanded] = useState(false);
  const drag = useRef<{ x: number; width: number; moved: boolean }>();
  const suppressClick = useRef(false);

  const resize = (width: number) => {
    const viewport = document.documentElement.clientWidth;
    const full = width >= viewport - 12;
    const bounded = Math.max(540, width);
    dialog.current?.style.setProperty("--resume-drawer-width", full ? "100%" : `${bounded}px`);
    setExpanded(full);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || !dialog.current) return;
    suppressClick.current = false;
    drag.current = { x: event.clientX, width: dialog.current.offsetWidth, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const delta = start.x - event.clientX;
    if (!start.moved && Math.abs(delta) < 5) return;
    start.moved = true;
    resize(start.width + delta);
  };

  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || !drag.current) return;
    suppressClick.current = drag.current.moved;
    drag.current = undefined;
  };

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 0 && suppressClick.current) return;
    if (expanded) {
      dialog.current?.style.removeProperty("--resume-drawer-width");
      setExpanded(false);
    } else {
      resize(document.documentElement.clientWidth);
    }
  };

  return { expanded, onClick, onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish };
};
