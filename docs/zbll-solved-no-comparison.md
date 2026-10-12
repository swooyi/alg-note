# ZBLL 기존 자료와 solved.no 비교

비교 기준: Git `HEAD`의 기존 ZBLL 자료와, 복원 전에 작업 폴더에 반영되어 있던 solved.no 기반 자료.

## 전체 결과

- 전체 case: 472개
- `id`, `group`, `svgId` 유지: True
- case 이름 변경: 472개
- 알고리즘 목록 변경: 382개
- 정규화 후 기존 알고리즘과 하나 이상 겹치는 case: 471개
- 알고리즘 교집합이 없는 case ID: 356
- 대표 알고리즘 변경: 60개
- setup 문자열 변경: 458개
- 새 알고리즘으로 SVG를 재생성했을 때 기존 SVG와 달랐던 case: 472개 (최종 반영에서는 재생성 SVG를 사용하지 않음)

| 분류 | case 수 | 알고리즘 교집합 있음 | 대표 알고리즘 변경 | setup 변경 |
|---|---:|---:|---:|---:|
| T | 72 | 72 | 8 | 71 |
| U | 72 | 72 | 12 | 70 |
| L | 72 | 72 | 3 | 69 |
| H | 40 | 40 | 5 | 38 |
| Pi | 72 | 72 | 11 | 70 |
| Sune | 72 | 71 | 9 | 70 |
| Antisune | 72 | 72 | 12 | 70 |

## ZBLLT02 예시

- 기존 이름: `T 2GLL2`
- solved.no case: `ZBLLT02`
- 기존 대표 알고리즘: `(U) x D' R' U R D R2' D2 R U' R' D2 R l`
- solved.no 대표 알고리즘: `(U) R' U R U2 R' U' R U' R U R' U' R' U' R U R U' R'`
- 기존 setup: `F' R F' R F R2 F U F' R2 F' R' F R' F`
- solved.no 대표 알고리즘에서 역산한 setup: `R U R' U' R' U R U R U' R' U R' U R U2 R' U' R U'`
- 제안했던 rec: `['T', '2GLL']`

472개 case별 상세 비교는 [`zbll-solved-no-comparison.json`](./zbll-solved-no-comparison.json)에 기록했다. 최종 데이터에는 solved.no의 case·alg·setup을 적용하고 기존 SVG를 그대로 유지했다.
