import fs from 'fs';

export interface Spec {
  readonly path: string;
  get(): object;
  set(content: object): void;
}

export function toSpecConnector(specPath: string) {
  return {
    path: specPath,
    get() {
      return JSON.parse(fs.readFileSync(specPath).toString());
    },
    set(content) {
      fs.writeFileSync(specPath, JSON.stringify(content, null, 2));
    }
  };
}
