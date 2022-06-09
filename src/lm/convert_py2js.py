import sys
sys.path.append("../lm-counter/apis")
from constants import ITEMS, MONSTER_IDS

with open("src/lm/constants.js", "w") as f:
    f.write("const ITEMS = {\n")
    # '0100': ('Hero item', 'Hero item', '', -1, -1, '')
    for k, vs in ITEMS.items():
        assert len(k) == 4
        k = k[2:4] + k[:2]
        f.write(f'  "{int(k, 16)}": ["{vs[0]}", "{vs[1]}", "{vs[2]}", {vs[3]}, {vs[4]}, "{vs[5]}"],\n')

    f.write("}\n\n")
    f.write("const MONSTER_IDS = {\n")
    # '0100': ('Hero item', 'Hero item', '', -1, -1, '')
    for k, vs in MONSTER_IDS.items():
        assert len(k) == 4
        k = k[2:4] + k[:2]
        f.write(f'  "{int(k, 16)}": "{vs}",\n')

    f.write("}\n\n")

    f.write("export {\n  ITEMS,\n  MONSTER_IDS\n}\n")