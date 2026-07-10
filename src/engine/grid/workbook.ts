import { Sheet } from './sheet';

/** A workbook is an ordered collection of named sheets. */
export class Workbook {
  name: string;
  private sheets: Sheet[] = [];
  activeIndex = 0;

  constructor(name = 'Workbook') {
    this.name = name;
    this.sheets.push(new Sheet('Sheet1'));
  }

  get sheetCount(): number {
    return this.sheets.length;
  }

  sheetNames(): string[] {
    return this.sheets.map((s) => s.name);
  }

  active(): Sheet {
    return this.sheets[this.activeIndex]!;
  }

  sheetAt(i: number): Sheet | undefined {
    return this.sheets[i];
  }

  sheetByName(name: string): Sheet | undefined {
    return this.sheets.find((s) => s.name === name);
  }

  addSheet(name?: string): Sheet {
    const finalName = name ?? this.uniqueName('Sheet');
    if (this.sheetByName(finalName)) {
      throw new Error(`Sheet '${finalName}' already exists`);
    }
    const sheet = new Sheet(finalName);
    this.sheets.push(sheet);
    return sheet;
  }

  removeSheet(index: number): void {
    if (this.sheets.length <= 1) throw new Error('A workbook must keep at least one sheet');
    if (index < 0 || index >= this.sheets.length) throw new Error('Sheet index out of range');
    this.sheets.splice(index, 1);
    if (this.activeIndex >= this.sheets.length) this.activeIndex = this.sheets.length - 1;
  }

  renameSheet(index: number, name: string): void {
    if (index < 0 || index >= this.sheets.length) throw new Error('Sheet index out of range');
    const existing = this.sheetByName(name);
    if (existing && existing !== this.sheets[index]) {
      throw new Error(`Sheet '${name}' already exists`);
    }
    this.sheets[index]!.name = name;
  }

  private uniqueName(prefix: string): string {
    let i = this.sheets.length + 1;
    while (this.sheetByName(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
  }
}
