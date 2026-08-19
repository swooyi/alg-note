# swooyi's ALG note

A browser-based algorithm note and trainer for FTO, Square-1, and 3x3 cases.

## License

This project is licensed under the GNU General Public License, version 3 only.
See [LICENSE](LICENSE).

## Third-Party Data And Images

Algorithm data and case SVG images in `alg/` are derived from
[mihlefeld/Alg-Trainers](https://github.com/mihlefeld/Alg-Trainers),
which is licensed under GPL-3.0.

This project extracts, reorganizes, and modifies portions of that data for
this application. The original source and license notices remain applicable
to those materials.

The Korean and Japanese flag graphics in `app/images/` are from Twemoji and
are licensed under CC BY 4.0. See `app/images/ATTRIBUTION.md`.

## Build Data

After changing files in `alg/`, rebuild the browser bundle with:

```bash
python scripts/build_app_data.py
```
