import { ESC_POS } from '../constants';

export function generateOpenDrawerCommand(): string {
    return ESC_POS.INIT + ESC_POS.OPEN_DRAWER;
}

export function generateBeepCommand(): string {
    return ESC_POS.INIT + ESC_POS.BEEP;
}
