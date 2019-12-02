import fs from 'fs';

export interface Spec {
  readonly path: string;
  get(): any;
  set(content: object): void;
  revert(): void;
}

export function toSpecConnector(specPath: string): Spec {
  const originalContent = fs.readFileSync(specPath);
  return {
    path: specPath,
    get() {
      return JSON.parse(fs.readFileSync(specPath).toString());
    },
    set(content) {
      fs.writeFileSync(specPath, JSON.stringify(content, null, 2));
    },
    revert() {
      fs.writeFileSync(specPath, originalContent);
    }
  };
}
