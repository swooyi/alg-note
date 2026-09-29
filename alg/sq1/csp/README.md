# CSP

사용자 시트 `내CSP 학습`의 90행을 카드로 표시한다. 원본 URL은 algset.json에 있다.

- `cases.json`: U/D 모양, 확률, 공통 카운팅 보정, 비고. `algorithms[0]`은 Odd, `[1]`은 Even 설명이다. 줄바꿈과 축약 표현을 보존한다.
- `csp.extraCount`: 케이스 전체에 적용하는 0 또는 1. Odd/Even별 속성이 아니다. 노란 셀의 의미를 옮긴 값이며 알고리즘 열을 자동 교환하지 않는다.
- `shapes/`: 사용자가 직접 그린 원본 SVG 29개. 원본 방향과 색상을 보존한다.
- `svgs.json`: 카드별 U/D 이미지 쌍. 각 SVG를 독립된 이미지로 넣어 스타일 충돌을 방지한다. Star와 7-1의 표시용 여백만 공통 200단위 좌표계로 맞춘다.
- 시트 `3/5 → 5-3.svg`, `2-6 → 6-2.svg`, `1/7 → 7-1.svg` 매핑은 사용자가 확인했다.
- `source/cache/sq1-csp/sheet.json`: 시트 값과 노란색에서 추출한 카운팅 정보. 시트 셋업은 여기에만 보관한다. 패리티별 셋업을 제공받기 전까지 앱의 scramble은 비우고 드릴은 비활성화한다.
- 시트의 확률 값을 그대로 보존한다. 반올림된 확률의 합을 맞추려고 개별 값을 수정하지 않는다.

새 XLSX와 SVG 원본을 받으면 `python scripts/import_sq1_csp.py <sheet.xlsx> <All shape 경로>`로 다시 가져온다(openpyxl 필요).
이후 `python scripts/validate_alg_json.py alg/sq1/csp`, `python scripts/build_app_data.py`를 실행한다.
