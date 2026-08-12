# Alg Data Guide

이 문서는 새 해법 세트를 추가하거나 기존 해법 데이터를 보강할 때 따르는 기준이다.

## 원본 위치

새 해법 세트의 원본 데이터는 `alg/{puzzle-id}/{algset-id}/` 아래에 둔다.

```text
alg/
  3x3/
    zbls/
      algset.json
      groups.json
      cases.json
      svgs.json
  fto/
    1l3t/
      algset.json
      groups.json
      cases.json
      svgs.json
    lbt/
      algset.json
      groups.json
      cases.json
      svgs.json
```

`source/`는 레거시 데이터 또는 과거 변환 산출물 성격이 강하다. 앱에서 직접 쓰는 번들 데이터는 `scripts/build_app_data.py`가 `alg/*/*`를 읽어 `app/js/data.js`로 생성한다.

## 필수 파일

각 algset 폴더에는 아래 네 파일이 모두 있어야 한다.

- `algset.json`: 해법 세트 메타데이터
- `groups.json`: 그룹 목록과 그룹별 케이스 순서
- `cases.json`: 케이스별 이름, 알고리즘, 스크램블, 태그
- `svgs.json`: 케이스 이미지 SVG 문자열

## algset.json

```json
{
  "schemaVersion": 1,
  "puzzle": "FTO",
  "id": "example",
  "name": "Example",
  "source": {
    "legacyPath": "source/legacy/example",
    "url": ""
  },
  "notes": []
}
```

`id`는 폴더명과 맞추는 것을 기본으로 한다. `groups.json`, `cases.json`, `svgs.json`의 `algset` 값은 이 `id`와 같아야 한다.

## groups.json

```json
{
  "schemaVersion": 1,
  "puzzle": "FTO",
  "algset": "example",
  "groups": [
    {
      "id": "group-id",
      "name": "Group Name",
      "sourceName": "Original Group Name",
      "caseIds": ["1", "2", "3"]
    }
  ]
}
```

`caseIds`는 화면에 표시할 그룹 내 케이스 순서다. 모든 케이스는 정확히 한 번 이상 그룹에서 참조되어야 한다.

## cases.json

```json
{
  "schemaVersion": 1,
  "puzzle": "FTO",
  "algset": "example",
  "cases": [
    {
      "id": "1",
      "name": "Case Name",
      "group": "group-id",
      "algorithms": [
        "R U R' U'"
      ],
      "scramble": "R U' R' U",
      "scrambles": [
        "R U' R' U"
      ],
      "svgId": "1",
      "tags": {
        "sourceGroup": "Original Group Name"
      }
    }
  ]
}
```

필수로 관리할 값은 `id`, `name`, `group`, `algorithms`, `scramble`, `scrambles`, `svgId`다. 앱은 `algorithms`, `scrambles`, `tags`가 없으면 빈 값으로 보정하지만, 검증 스크립트는 `algorithms`와 대표 `scramble`을 요구한다.

`scramble`은 대표 스크램블이고, `scrambles`는 후보 스크램블 목록이다. 대표 스크램블은 보통 `scrambles[0]`와 맞춘다.

## svgs.json

이미지는 별도 이미지 폴더에 파일로 보관하지 않고, `svgs.json` 안에 SVG 문자열로 보관한다.

```json
{
  "schemaVersion": 1,
  "puzzle": "FTO",
  "algset": "example",
  "svgs": {
    "1": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 88\">...</svg>"
  }
}
```

기본 규칙은 `case.id == case.svgId == svgs`의 키다. 다른 SVG를 재사용해야 할 때만 `svgId`를 별도로 지정한다. 현재 검증 스크립트는 `svgs.json`의 모든 키가 동일한 `case.id`를 가진다고 가정한다.

원본 이미지가 PNG뿐인 경우에는 PNG를 base64 data URL로 만들고, 아래처럼 SVG의 `image` 요소로 감싸서 저장한다.

```json
{
  "svgs": {
    "1": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 150 150\"><image href=\"data:image/png;base64,...\" width=\"150\" height=\"150\"/></svg>"
  }
}
```

## 추가 절차

1. `alg/{puzzle-id}/{algset-id}/` 폴더를 만들고 네 JSON 파일을 추가한다.
2. `algset.json`의 `id`와 나머지 파일의 `algset` 값을 맞춘다.
3. `groups.json`의 `caseIds`에 모든 케이스 ID를 표시 순서대로 넣는다.
4. `cases.json`의 각 케이스에 `group`, `algorithms`, `scramble`, `scrambles`, `svgId`를 채운다.
5. `svgs.json`의 `svgs`에 각 케이스 이미지 SVG 문자열을 넣는다.
6. 아래 명령으로 구조를 검증한다.

```powershell
python scripts/validate_alg_json.py alg/{puzzle-id}/{algset-id}
```

7. 앱 번들을 갱신한다.

```powershell
python scripts/build_app_data.py
```

## 주의사항

- `app/js/data.js`는 생성물이다. 원본 수정은 `alg/{puzzle-id}/{algset-id}/`의 JSON에서 한다.
- 케이스 ID는 문자열로 유지한다.
- 새 algset 폴더에 필수 네 파일이 모두 없으면 번들 생성 대상에서 제외된다.
- `tags`는 자유 확장 영역이지만, 현재 UI는 일부 데이터에서 `parity`, `recognition`, `tcp` 등을 활용한다.
