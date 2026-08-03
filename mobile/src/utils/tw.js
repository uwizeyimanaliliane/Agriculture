const units = {
  '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10,
  '3': 12, '3.5': 14, '4': 16, '5': 20, '6': 24,
  '7': 28, '8': 32, '9': 36, '10': 40, '11': 44, '12': 48,
  '14': 56, '16': 64, '20': 80, '24': 96, '28': 112, '32': 128,
  '36': 144, '40': 160, '44': 176, '48': 192, '52': 208, '56': 224,
  '60': 240, '64': 256, '72': 288, '80': 320, '96': 384,
};

const textSizes = {
  'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
};

const colors = {
  'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
  'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e',
  'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534',
  'green-900': '#14532d',
  'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa',
  'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-600': '#ea580c',
  'orange-700': '#c2410c',
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
  'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
  'red-400': '#f87171', 'red-500': '#ef4444', 'red-600': '#dc2626',
  'red-700': '#b91c1c',
  'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-500': '#a855f7',
  'purple-700': '#7e22ce',
  'amber-500': '#f59e0b', 'amber-600': '#d97706',
  'teal-500': '#14b8a6', 'teal-600': '#0d9488',
  'lime-500': '#84cc16',
  'yellow-400': '#facc15', 'yellow-500': '#eab308',
  'rose-500': '#f43f5e',
  'pink-500': '#ec4899',
  'indigo-500': '#6366f1',
  'violet-500': '#8b5cf6',
  'cyan-500': '#06b6d4',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280',
  'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937',
  'gray-900': '#111827',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
  'slate-900': '#0f172a', 'slate-950': '#020617',
  'white': '#ffffff', 'black': '#000000',
};

export function tw(className) {
  if (!className || typeof className !== 'string') return {};
  const classes = className.split(/\s+/);
  const style = {};

  for (const cls of classes) {
    if (cls === 'flex') style.display = 'flex';
    else if (cls === 'flex-1') style.flex = 1;
    else if (cls === 'grow') style.flexGrow = 1;
    else if (cls === 'grow-0') style.flexGrow = 0;
    else if (cls === 'shrink') style.flexShrink = 1;
    else if (cls === 'shrink-0') style.flexShrink = 0;
    else if (cls.startsWith('basis-') && units[cls.slice(6)] !== undefined) style.flexBasis = units[cls.slice(6)];
    else if (cls === 'flex-row') style.flexDirection = 'row';
    else if (cls === 'flex-col') style.flexDirection = 'column';
    else if (cls === 'flex-wrap') style.flexWrap = 'wrap';
    else if (cls === 'flex-nowrap') style.flexWrap = 'nowrap';
    else if (cls === 'items-center') style.alignItems = 'center';
    else if (cls === 'items-start') style.alignItems = 'flex-start';
    else if (cls === 'items-end') style.alignItems = 'flex-end';
    else if (cls === 'items-stretch') style.alignItems = 'stretch';
    else if (cls === 'items-baseline') style.alignItems = 'baseline';
    else if (cls === 'justify-center') style.justifyContent = 'center';
    else if (cls === 'justify-between') style.justifyContent = 'space-between';
    else if (cls === 'justify-around') style.justifyContent = 'space-around';
    else if (cls === 'justify-evenly') style.justifyContent = 'space-evenly';
    else if (cls === 'justify-end') style.justifyContent = 'flex-end';
    else if (cls === 'justify-start') style.justifyContent = 'flex-start';
    else if (cls === 'self-start') style.alignSelf = 'flex-start';
    else if (cls === 'self-end') style.alignSelf = 'flex-end';
    else if (cls === 'self-center') style.alignSelf = 'center';
    else if (cls === 'self-stretch') style.alignSelf = 'stretch';
    else if (cls === 'text-center') style.textAlign = 'center';
    else if (cls === 'text-left') style.textAlign = 'left';
    else if (cls === 'text-right') style.textAlign = 'right';
    else if (cls === 'text-justify') style.textAlign = 'justify';
    else if (cls === 'font-bold') style.fontWeight = 'bold';
    else if (cls === 'font-semibold') style.fontWeight = '600';
    else if (cls === 'font-medium') style.fontWeight = '500';
    else if (cls === 'font-normal') style.fontWeight = '400';
    else if (cls === 'font-light') style.fontWeight = '300';
    else if (cls === 'font-thin') style.fontWeight = '100';
    else if (cls === 'italic') style.fontStyle = 'italic';
    else if (cls === 'uppercase') style.textTransform = 'uppercase';
    else if (cls === 'lowercase') style.textTransform = 'lowercase';
    else if (cls === 'capitalize') style.textTransform = 'capitalize';
    else if (cls === 'underline') style.textDecorationLine = 'underline';
    else if (cls === 'line-through') style.textDecorationLine = 'line-through';
    else if (cls === 'no-underline') style.textDecorationLine = 'none';
    else if (cls === 'overflow-hidden') style.overflow = 'hidden';
    else if (cls === 'overflow-visible') style.overflow = 'visible';
    else if (cls === 'overflow-scroll') style.overflow = 'scroll';
    else if (cls === 'absolute') style.position = 'absolute';
    else if (cls === 'relative') style.position = 'relative';
    else if (cls.startsWith('z-') && units[cls.slice(2)] !== undefined) style.zIndex = units[cls.slice(2)];
    else if (cls.startsWith('opacity-')) {
      const v = parseInt(cls.slice(8));
      if (!isNaN(v)) style.opacity = v / 100;
    }
    else if (cls === 'hidden') style.display = 'none';
    else if (cls.startsWith('inset-') && units[cls.slice(6)] !== undefined) {
      style.top = style.right = style.bottom = style.left = units[cls.slice(6)];
    }
    else if (cls.startsWith('top-') && units[cls.slice(4)] !== undefined) style.top = units[cls.slice(4)];
    else if (cls.startsWith('bottom-') && units[cls.slice(7)] !== undefined) style.bottom = units[cls.slice(7)];
    else if (cls.startsWith('left-') && units[cls.slice(5)] !== undefined) style.left = units[cls.slice(5)];
    else if (cls.startsWith('right-') && units[cls.slice(6)] !== undefined) style.right = units[cls.slice(6)];
    else if (cls in textSizes) style.fontSize = textSizes[cls];
    else if (cls.startsWith('text-') && colors[cls.slice(5)]) style.color = colors[cls.slice(5)];
    else if (cls.startsWith('bg-') && colors[cls.slice(3)]) style.backgroundColor = colors[cls.slice(3)];
    else if (cls.startsWith('border-')) {
      const rest = cls.slice(7);
      if (colors[rest]) {
        if (style.borderWidth === undefined && style.borderTopWidth === undefined) style.borderWidth = 1;
        style.borderColor = colors[rest];
      } else if (cls === 'border') {
        if (style.borderWidth === undefined && style.borderTopWidth === undefined) style.borderWidth = 1;
      } else if (rest === '0') { style.borderWidth = 0 }
      else if (rest === '2') { style.borderWidth = 2 }
      else if (rest === '4') { style.borderWidth = 4 }
      else if (rest === 't') { if (style.borderWidth === undefined) style.borderWidth = 0; style.borderTopWidth = 1 }
      else if (rest === 'b') { if (style.borderWidth === undefined) style.borderWidth = 0; style.borderBottomWidth = 1 }
      else if (rest === 'l') { if (style.borderWidth === undefined) style.borderWidth = 0; style.borderLeftWidth = 1 }
      else if (rest === 'r') { if (style.borderWidth === undefined) style.borderWidth = 0; style.borderRightWidth = 1 }
      else if (rest === 'x') { if (style.borderWidth === undefined) style.borderWidth = 0; style.borderLeftWidth = 1; style.borderRightWidth = 1 }
      else if (rest === 'y') { if (style.borderWidth === undefined) style.borderWidth = 0; style.borderTopWidth = 1; style.borderBottomWidth = 1 }
      else if (rest === 'dashed') style.borderStyle = 'dashed';
      else if (rest === 'dotted') style.borderStyle = 'dotted';
    }
    else if (cls.startsWith('rounded-')) {
      const size = cls.slice(8);
      if (size === 'full') style.borderRadius = 9999;
      else if (size === '3xl') style.borderRadius = 24;
      else if (size === '2xl') style.borderRadius = 16;
      else if (size === 'xl') style.borderRadius = 12;
      else if (size === 'lg') style.borderRadius = 8;
      else if (size === 'md') style.borderRadius = 6;
      else if (size === 'sm') style.borderRadius = 4;
      else if (size === 'none') style.borderRadius = 0;
      else if (size === 't') { style.borderTopLeftRadius = 12; style.borderTopRightRadius = 12 }
      else if (size === 'b') { style.borderBottomLeftRadius = 12; style.borderBottomRightRadius = 12 }
      else if (size === 'l') { style.borderTopLeftRadius = 12; style.borderBottomLeftRadius = 12 }
      else if (size === 'r') { style.borderTopRightRadius = 12; style.borderBottomRightRadius = 12 }
    }
    else if (cls.startsWith('gap-') && units[cls.slice(4)] !== undefined) style.gap = units[cls.slice(4)];
    else if (cls.startsWith('gap-x-') && units[cls.slice(6)] !== undefined) style.columnGap = units[cls.slice(6)];
    else if (cls.startsWith('gap-y-') && units[cls.slice(6)] !== undefined) style.rowGap = units[cls.slice(6)];
    else if (cls.startsWith('space-x-') && units[cls.slice(8)] !== undefined) { /* handled by parent flex gap */ }
    else if (cls.startsWith('space-y-') && units[cls.slice(8)] !== undefined) { /* handled by parent flex gap */ }
    else if (cls === 'rounded') style.borderRadius = 4;
    else if (cls.startsWith('leading-')) {
      const v = cls.slice(8);
      if (v === 'none') style.lineHeight = 1;
      else if (v === 'tight') style.lineHeight = 1.25;
      else if (v === 'snug') style.lineHeight = 1.375;
      else if (v === 'normal') style.lineHeight = 1.5;
      else if (v === 'relaxed') style.lineHeight = 1.625;
      else if (v === 'loose') style.lineHeight = 2;
      else { const n = parseFloat(v); if (!isNaN(n)) style.lineHeight = n * 4 }
    }
    else if (cls.startsWith('tracking-')) {
      const v = cls.slice(9);
      if (v === 'tighter') style.letterSpacing = -0.8;
      else if (v === 'tight') style.letterSpacing = -0.4;
      else if (v === 'normal') style.letterSpacing = 0;
      else if (v === 'wide') style.letterSpacing = 0.4;
      else if (v === 'wider') style.letterSpacing = 0.8;
      else if (v === 'widest') style.letterSpacing = 1.6;
    }
    else if (cls.startsWith('-p-') && units[cls.slice(3)] !== undefined) style.padding = -units[cls.slice(3)];
    else if (cls.startsWith('-px-') && units[cls.slice(4)] !== undefined) style.paddingHorizontal = -units[cls.slice(4)];
    else if (cls.startsWith('-py-') && units[cls.slice(4)] !== undefined) style.paddingVertical = -units[cls.slice(4)];
    else if (cls.startsWith('-pt-') && units[cls.slice(4)] !== undefined) style.paddingTop = -units[cls.slice(4)];
    else if (cls.startsWith('-pb-') && units[cls.slice(4)] !== undefined) style.paddingBottom = -units[cls.slice(4)];
    else if (cls.startsWith('-pl-') && units[cls.slice(4)] !== undefined) style.paddingLeft = -units[cls.slice(4)];
    else if (cls.startsWith('-pr-') && units[cls.slice(4)] !== undefined) style.paddingRight = -units[cls.slice(4)];
    else if (cls.startsWith('p-') && units[cls.slice(2)] !== undefined) style.padding = units[cls.slice(2)];
    else if (cls.startsWith('px-') && units[cls.slice(3)] !== undefined) style.paddingHorizontal = units[cls.slice(3)];
    else if (cls.startsWith('py-') && units[cls.slice(3)] !== undefined) style.paddingVertical = units[cls.slice(3)];
    else if (cls.startsWith('pt-') && units[cls.slice(3)] !== undefined) style.paddingTop = units[cls.slice(3)];
    else if (cls.startsWith('pb-') && units[cls.slice(3)] !== undefined) style.paddingBottom = units[cls.slice(3)];
    else if (cls.startsWith('pl-') && units[cls.slice(3)] !== undefined) style.paddingLeft = units[cls.slice(3)];
    else if (cls.startsWith('pr-') && units[cls.slice(3)] !== undefined) style.paddingRight = units[cls.slice(3)];
    else if (cls.startsWith('-m-') && units[cls.slice(3)] !== undefined) style.margin = -units[cls.slice(3)];
    else if (cls.startsWith('-mx-') && units[cls.slice(4)] !== undefined) style.marginHorizontal = -units[cls.slice(4)];
    else if (cls.startsWith('-my-') && units[cls.slice(4)] !== undefined) style.marginVertical = -units[cls.slice(4)];
    else if (cls.startsWith('-mt-') && units[cls.slice(4)] !== undefined) style.marginTop = -units[cls.slice(4)];
    else if (cls.startsWith('-mb-') && units[cls.slice(4)] !== undefined) style.marginBottom = -units[cls.slice(4)];
    else if (cls.startsWith('-ml-') && units[cls.slice(4)] !== undefined) style.marginLeft = -units[cls.slice(4)];
    else if (cls.startsWith('-mr-') && units[cls.slice(4)] !== undefined) style.marginRight = -units[cls.slice(4)];
    else if (cls.startsWith('m-') && units[cls.slice(2)] !== undefined) style.margin = units[cls.slice(2)];
    else if (cls.startsWith('mx-') && units[cls.slice(3)] !== undefined) style.marginHorizontal = units[cls.slice(3)];
    else if (cls.startsWith('my-') && units[cls.slice(3)] !== undefined) style.marginVertical = units[cls.slice(3)];
    else if (cls.startsWith('mt-') && units[cls.slice(3)] !== undefined) style.marginTop = units[cls.slice(3)];
    else if (cls.startsWith('mb-') && units[cls.slice(3)] !== undefined) style.marginBottom = units[cls.slice(3)];
    else if (cls.startsWith('ml-') && units[cls.slice(3)] !== undefined) style.marginLeft = units[cls.slice(3)];
    else if (cls.startsWith('mr-') && units[cls.slice(3)] !== undefined) style.marginRight = units[cls.slice(3)];
    else if (cls === 'shadow-sm') { style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; style.elevation = 1 }
    else if (cls === 'shadow') { style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; style.elevation = 3 }
    else if (cls === 'shadow-md') { style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; style.elevation = 4 }
    else if (cls === 'shadow-lg') { style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'; style.elevation = 5 }
    else if (cls === 'shadow-xl') { style.boxShadow = '0 8px 12px rgba(0,0,0,0.2)'; style.elevation = 7 }
    else if (cls === 'shadow-2xl') { style.boxShadow = '0 12px 16px rgba(0,0,0,0.25)'; style.elevation = 10 }
    else if (cls.startsWith('w-') && units[cls.slice(2)] !== undefined) style.width = units[cls.slice(2)];
    else if (cls.startsWith('h-') && units[cls.slice(2)] !== undefined) style.height = units[cls.slice(2)];
    else if (cls === 'w-full') style.width = '100%';
    else if (cls === 'h-full') style.height = '100%';
    else if (cls === 'w-screen') style.width = '100%';
    else if (cls === 'h-screen') style.height = '100%';
    else if (cls.startsWith('w-')) {
      const w = cls.slice(2);
      if (w === '1/2') style.width = '50%';
      else if (w === '1/3') style.width = '33.33%';
      else if (w === '2/3') style.width = '66.67%';
      else if (w === '1/4') style.width = '25%';
      else if (w === '3/4') style.width = '75%';
      else if (w.endsWith('%')) { const pct = parseFloat(w); if (!isNaN(pct)) style.width = `${pct}%` }
      else if (/^\[\d+(?:\.\d+)?%\]$/.test(w)) style.width = parseFloat(w.slice(1, -2)) + '%';
    }
    else if (cls.startsWith('h-')) {
      const h = cls.slice(2);
      if (h === '1/2') style.height = '50%';
      else if (h === '1/3') style.height = '33.33%';
      else if (h === '2/3') style.height = '66.67%';
      else if (h === '1/4') style.height = '25%';
      else if (h === '3/4') style.height = '75%';
      else if (h.endsWith('%')) { const pct = parseFloat(h); if (!isNaN(pct)) style.height = `${pct}%` }
      else if (/^\[\d+(?:\.\d+)?%\]$/.test(h)) style.height = parseFloat(h.slice(1, -2)) + '%';
    }
    else if (cls.startsWith('min-w-') && units[cls.slice(6)] !== undefined) style.minWidth = units[cls.slice(6)];
    else if (cls === 'min-w-full') style.minWidth = '100%';
    else if (cls.startsWith('max-w-') && units[cls.slice(6)] !== undefined) style.maxWidth = units[cls.slice(6)];
    else if (cls === 'max-w-full') style.maxWidth = '100%';
    else if (cls.startsWith('min-h-') && units[cls.slice(6)] !== undefined) style.minHeight = units[cls.slice(6)];
    else if (cls === 'min-h-full') style.minHeight = '100%';
    else if (cls.startsWith('max-h-') && units[cls.slice(6)] !== undefined) style.maxHeight = units[cls.slice(6)];
    else if (cls === 'max-h-full') style.maxHeight = '100%';
  }

  return style;
}
