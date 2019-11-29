import { bold, yellow } from 'chalk';

export function printCompilationWarning(): void {
  console.info();
  printWarnLine(70);
  printWarnLine(3, bold(`Make sure that your are using the latest code!`), 21);
  printWarnLine(70);
  printWarnLine(3, 'If any of your packages require to be compiled, please make sure', 3);
  printWarnLine(3, `that you start any ${bold('yarn watch, yarn build, etc.')} command.`, 11);
  printWarnLine(70);
  printWarnLine(3, `Otherwise, you can end up with the outdated linked code.`, 11);
  printWarnLine(70);
  console.info();
}

function printWarnLine(length: number): void;
function printWarnLine(leftPadding: number, text: string, rightPadding: number): void;
function printWarnLine(leftPadding: number, text?: string, rightPadding?: number): void {
  const p = length =>
    Array.from(new Array(length))
      .fill(' ')
      .join('');

  if (text == null && rightPadding == null) {
    console.info(yellow.inverse(p(leftPadding)));
  } else {
    console.info(yellow.inverse(p(leftPadding) + text + p(rightPadding)));
  }
}
