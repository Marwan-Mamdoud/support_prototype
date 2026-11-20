# Turuq Design System

This document outlines the visual design rules and tokens used across the Turuq frontend.

---

## 1. Color Palette

### Brand Colors

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#032486` | Primary dark navy blue — headers, primary buttons, brand identity |
| `secondary_accent` | `#38cbfc` | Bright cyan — secondary buttons, icons, highlights, hover states |
| `primary-950` | `#03256c` | Main shade of primary scale (very dark blue) |
| `primary-500` | `#008bff` | Bright blue accent |
| `secondary-500` | `#06bee1` | Cyan accent |
| `secondary-950` | `#083244` | Dark teal |
| `thumbnail` | `#42c7b8` | Teal/green — thumbnail badges, tags |

### Neutral Colors

| Token | Hex | Usage |
|---|---|---|
| White | `#ffffff` | Backgrounds, text on dark surfaces |
| Black | `#000000` | Text, icons, borders |
| Dark gray | `#1d1d1d` | Body text (forms, labels) |
| Light blue-white | `#eff7fd` | Dialog/card backgrounds (courier pages) |
| WhatsApp green | `#144d37` | WhatsApp message bubble |
| Overlay | `#00000020` | Modal backdrop (12.5% opacity black) |

### Gradients

| Name | Colors |
|---|---|
| `lava-background` | `#032486 → #041c5c → #01bdfa → #032775 → #01091a` |
| `morphing-gradient` | `#ff9a9e → #fad0c4` |

### Tailwind Scales
- **Slate** (`slate-50` through `slate-900`) — subtle backgrounds, borders, muted text
- **Gray** (`gray-50` through `gray-900`) — neutral surfaces

---

## 2. Typography

### Font Sizes

| Class | Size | Usage |
|---|---|---|
| `text-xs` | 12px | Labels, captions, secondary text |
| `text-sm` | 14px | Body text, form inputs |
| `text-base` | 16px | Default body text |
| `text-lg` | 18px | Section headers |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Page headers |
| `text-5xl` | 48px | Large headers |
| `text-6xl` | 60px | Hero headers |
| `text-8xl` | 96px | Hero sections |

### Font Weights

| Class | Weight | Usage |
|---|---|---|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasis |
| `font-semibold` | 600 | Section headers, labels |
| `font-bold` | 700 | Titles, buttons, important text |

### Text Colors

| Class | Color |
|---|---|
| `text-accent` | `#032486` |
| `text-secondary_accent` | `#38cbfc` |
| `text-slate-600` | Secondary text |
| `text-slate-900` | Primary text on light backgrounds |
| `text-white` | Text on dark backgrounds |
| `text-red-500` | Error messages |

---

## 3. Spacing & Layout

### Container
- Max width: `1400px` (2xl breakpoint)
- Centered with `2rem` padding

### Grid System
- 12-column grid (`grid-cols-12`)
- Gap: `gap-5` (20px) for form layouts

### Common Spacing
| Class | Value | Usage |
|---|---|---|
| `p-2` | 8px | Small padding |
| `p-3` | 12px | Input padding |
| `p-4` | 16px | Card padding |
| `p-5` | 20px | Section padding |
| `gap-1` | 4px | Tight gaps |
| `gap-2` | 8px | Small gaps |
| `gap-2.5` | 10px | Medium small gaps |
| `gap-5` | 20px | Form field gaps |
| `gap-10` | 40px | Large gaps |

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px

---

## 4. Border Radius

| Class | Value | Usage |
|---|---|---|
| `rounded-sm` | 2px | Small elements |
| `rounded-md` | 6px | Default |
| `rounded-lg` | 8px | Cards, inputs |
| `rounded-xl` | 12px | Buttons, large cards |
| `rounded-2xl` | 16px | Large containers |
| `rounded-full` | 9999px | Avatars, pills |
| `tremor-small` | 6px | Tremor components |
| `tremor-default` | 8px | Tremor components |

---

## 5. Shadows

| Class | Usage |
|---|---|
| `drop-shadow-md` | Medium shadow for cards |
| `drop-shadow` | Subtle shadow |
| `shadow-slate-500` | Slate shadow color |
| `shadow-slate-700` | Darker slate shadow |
| `tremor-card` | Card shadow (1px 3px) |
| `tremor-dropdown` | Dropdown shadow (4px 6px) |

---

## 6. Component Patterns

### Buttons

**Primary Button:**
```tsx
<Button className="w-full bg-accent/80 hover:bg-accent text-white">
  Action
</Button>
```

**Secondary Button:**
```tsx
<Button className="bg-slate-100 hover:bg-slate-200 text-accent">
  Action
</Button>
```

**Small Action Button:**
```tsx
<div className="bg-white p-2 rounded-xl w-40 text-sm text-accent flex items-center drop-shadow-md shadow-slate-700">
  <TruckIcon className="size-4 lg:size-5 text-inherit mr-2" />
  <span className="text-xs lg:text-inherit">Add Courier</span>
</div>
```

### Inputs

**Standard Input:**
```tsx
<Input
  className="bg-slate-100 border border-slate-300 h-[50px] drop-shadow rounded-xl p-3 text-accent placeholder:text-accent/50"
  placeholder="Enter value"
/>
```

**Phone Input (with country flag):**
```tsx
<div className="flex items-center justify-between gap-2 bg-slate-100 border border-slate-300 h-[50px] drop-shadow rounded-xl pl-3 py-3">
  <Image src="/assets/images/egypt.webp" alt="egypt" width={24} height={24} />
  <Input className="h-[50px] shadow-none border-none bg-transparent ring-0 outline-none focus-visible:ring-0 focus-visible:outline-none" />
</div>
```

**Password Input (with toggle):**
- Eye icon button inside input container
- Toggle between `showPassword` states

### Cards

**Courier Card:**
```tsx
<div className="col-span-12 lg:col-span-6 flex flex-col gap-5 p-5 rounded-xl w-full bg-[#eff7fd] border border-slate-300">
  {/* content */}
</div>
```

**Information Card:**
```tsx
<InformationCard
  title="Delivered Today"
  value={data.statistics.deliveredToday}
  className="bg-accent text-white"
/>
```

### Forms

**Form Field Pattern:**
```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="font-bold text-xs">Label*</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Form Layout:**
- 12-column grid (`grid-cols-12`)
- Fields: `col-span-6` or `col-span-12`
- Gap: `gap-5`
- Padding: `p-2` on field wrappers

### Dialogs

**Alert Dialog (Confirmation):**
```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent className="bg-[#eff7fd] border border-slate-300">
    <AlertDialogHeader>
      <AlertDialogTitle>Title</AlertDialogTitle>
      <AlertDialogDescription>Description</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-emerald-500 text-white">Confirm</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Custom Dialog (Form):**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="bg-white lg:max-w-3xl">
    <DialogHeader>
      <DialogTitle className="uppercase text-accent/50 font-bold text-xl">
        Title
      </DialogTitle>
    </DialogHeader>
    {/* form content */}
  </DialogContent>
</Dialog>
```

### Loading States

**Spinner:**
```tsx
<Loader2Icon size={24} className="text-white animate-spin" />
```

**Loading Text:**
```tsx
<AlertDialogTitle>Loading Courier Info</AlertDialogTitle>
<Loader2Icon size={24} className="text-black animate-spin align-middle" />
```

### Toasts

**Success:**
```tsx
toast({ title: "Courier Added Successfully", description: "..." });
// or
toast.success("Courier Activated", { description: "..." });
```

**Error:**
```tsx
toast({ title: "Failed to Add Courier", description: data.error, variant: "destructive" });
// or
toast.error("Activation Failed", { description: res.error });
```

---

## 7. Animation & Effects

### Lava Background
```css
.lava-background {
  background: linear-gradient(-45deg, #032486, #041c5c, #01bdfa, #032775, #01091a, #01091a);
  background-size: 400% 400%;
  animation: lava-flow 30s ease-in-out infinite;
}
```

### Glass Effect
```css
.glass {
  @apply bg-white bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10 drop-shadow-xl ring-0 ring-secondary_accent/10;
}
```

### Dot Background
```css
.dot-background {
  background-image: radial-gradient(#ffffff 1px, transparent 0);
  background-size: 7px 7px;
}
```

---

## 8. Icons

- **Lucide React** — primary icon library (`Loader2Icon`, `TruckIcon`, `UserRoundCheckIcon`, `X`, etc.)
- **Custom SVG** — for specialized icons (eye toggle, password visibility)
- Icon sizes: `size-4` (16px), `size-5` (20px), `size-24` (24px)

---

## 9. Image Assets

| Asset | Path |
|---|---|
| Egypt flag | `/assets/images/egypt.webp` |
| Turuq logo | `/assets/images/turuq-logo.svg` (or similar) |
| Placeholder images | `/assets/images/placeholder.png` |

---

## 10. Accessibility

- Use `sr-only` for screen-reader-only text on close buttons
- Form labels with `*` for required fields
- `aria-hidden` for decorative elements
- Focus rings: `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`

---

## 11. Responsive Design

- Mobile-first approach
- Breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`
- Conditional classes with `lg:` prefix for desktop
- Scroll areas for long forms (`ScrollArea` with `max-h-[400px]`)
- Hidden elements on mobile: `hidden lg:flex`

---

## 12. Data Attributes

The codebase uses `data-testid` for E2E testing:
- `data-testid="new-tab"` — New API key tab
- `data-testid="manage-tab"` — Manage API keys tab
- `data-testid="api-key-name-input"` — API key name input
- `data-testid="generate-key-btn"` — Generate key button
- `data-testid="reveal-key-btn"` — Reveal key button
- `data-testid="keys-table"` — Keys table
- `data-testid="validate-key-btn"` — Validate key button
- `data-testid="disable-key-btn"` — Disable key button

---

*Last updated: November 2026*