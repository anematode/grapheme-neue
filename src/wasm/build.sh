#!/bin/bash

EXPORTS="bigint_external_init bigint_get_words bigint_get_sign bigint_get_word_count free_bigint"

EXPORTS=' ' read -r -a array <<< ${EXPORTS}
EXPORTED_FUNCTIONS='['

for export in ${EXPORTS}; do
EXPORTED_FUNCTIONS+="'_grapheme_${export}',"
done

EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS%?} # Remove trailing comma
EXPORTED_FUNCTIONS+=']'

echo "Exporting: ${EXPORTED_FUNCTIONS}"

emcc ./grapheme_wasm.c -o grapheme.js --pre-js prepare_module.js --post-js impl.js -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORTED_FUNCTIONS="${EXPORTED_FUNCTIONS}"
mv grapheme.js module.js
