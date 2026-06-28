const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** 0→A, 25→Z, 26→AA, 51→AZ, 52→BA … 701→ZZ (702 max boxes) */
export function genBoxLetter(index: number): string {
  if (index < 26) return ALPHA[index]!;
  const hi = Math.floor(index / 26) - 1;
  const lo = index % 26;
  return (ALPHA[hi] ?? ALPHA[25]!) + ALPHA[lo]!;
}

/** "Tata Consultancy Services"→"TCS", "HDFC Bank"→"HDF", "Infosys"→"INF" */
export function genClientCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.slice(0, 4).map(w => w[0]!.toUpperCase()).join('');
  if (words.length === 2) return (words[0]!.slice(0, 2) + words[1]![0]!).toUpperCase();
  return name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
}

/** "Vandalur"→"VND", "Kodambakkam"→"KDM", "Anna Nagar"→"ANN" */
export function genForestCode(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const consonants = first.replace(/[aeiouAEIOU0-9\s]/g, '').slice(0, 3).toUpperCase();
  return consonants.length >= 2 ? consonants : first.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
}

/** Full box prefix with trailing dash: "TCS-VND-A-" — server appends "001", "002"… */
export function boxPrefix(clientCode: string, forestCode: string, letter: string): string {
  return `${clientCode.toUpperCase()}-${forestCode.toUpperCase()}-${letter}-`;
}

/** Preview IDs for display: "TCS-VND-A-001, TCS-VND-A-002, TCS-VND-A-003…" */
export function previewTreeIds(clientCode: string, forestCode: string, letter = 'A', n = 3): string {
  const p = boxPrefix(clientCode, forestCode, letter);
  return Array.from({ length: n }, (_, i) => `${p}${String(i + 1).padStart(3, '0')}`).join(', ') + '…';
}
