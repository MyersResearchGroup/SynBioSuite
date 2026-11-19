# Test fixtures

## resources_synthetic.xlsx

A small Excel-to-SBOL Resources workbook that `tests/test_ingest.py` converts
with the real, pinned excel2sbol. It lives in the repo so the conversion tests
run in CI instead of skipping for want of files under `~/SPUR`.

**Every value in it is made up.** It holds no lab data: one chemical
(`fixture_chemical_1`) and one promoter (`fixture_promoter_1`, sequence
`atgcatgcatgcatgc`), both described as "Made-up value for tests". The welcome
sheet's `Domain` is left empty -- when it is set, excel2sbol queries that
SynBioHub during conversion.

### Where it comes from

`build_resources_fixture.py` derives it from `resources/templates/Resources.xlsm`
in [SynBioDex/Excel-to-SBOL](https://github.com/SynBioDex/Excel-to-SBOL) at
commit `5910698`. The conversion tests run it through the excel2sbol version
`requirements.txt` pins (2.0.1). The script keeps only the sheets the two made-up rows need, replaces formulas with
the values Excel cached for them, and writes the rows. Its comments say why
each step is there.

To regenerate, from `backend/`:

```
python tests/fixtures/build_resources_fixture.py ~/SPUR/Excel-to-SBOL/resources/templates/Resources.xlsm
```

pytest never runs the script, so run `python -m pytest tests/test_ingest.py`
after regenerating. If the converter pin moves, regenerate from the template at
the new commit.

### License

The template is distributed under Excel-to-SBOL's BSD 3-Clause License,
reproduced here as it requires:

```
BSD 3-Clause License

Copyright (c) 2020, SynBioHub
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
