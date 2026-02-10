import { User } from '../types';
import { RANKS, SETORES } from '../constants';

export interface AccessControlResult {
    podeSolicitar: boolean;
    ehSOP: boolean;
}

export function verificarAcesso(usuario: User | null): AccessControlResult {
    if (!usuario) {
        return { podeSolicitar: false, ehSOP: false };
    }

    // 3S tem índice 13 (0-based index in the array).
    // "TB", "MB", "BR", "CEL", "TEN CEL", "MAJ", "CAP", "1T", "2T", "ASP", "SO", "1S", "2S", "3S", "CB", "S1", "S2"
    // TB(0)... 3S(13)... S2(16)
    // Graduações acima de 3S têm índice < 13. 3S tem índice 13.
    // The requirement says: "Usuário (>= 3S) preenche o formulário."
    // So indexes <= 13 are allowed. Indexes > 13 (CB, S1, S2) are NOT allowed.

    const rankIndex = RANKS.indexOf(usuario.rank);
    const targetIndex = RANKS.indexOf("3S");

    // If rank is not found (-1), deny access safe default
    const podeSolicitar = rankIndex !== -1 && rankIndex <= targetIndex;

    const ehSOP = ["CH-SOP", "SOP-01", "SOP-02", "SOP-03"].includes(usuario.sector);

    return { podeSolicitar, ehSOP };
}
