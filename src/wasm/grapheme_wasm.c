#include <stdlib.h>

typedef struct grapheme_bigint {
    int sign; // -1, 0 or 1
    int word_count; // Number of used words
    int allocated_words; // Size of words
    int* words; // Words ptr
} grapheme_bigint;

// Return a grapheme_big_int ptr with words allocated to the given size, ready to be filled by the external code
grapheme_bigint* grapheme_bigint_external_init(int sign, int word_count, int allocated_words) {
    grapheme_bigint* bigint = (grapheme_bigint*) malloc(sizeof(grapheme_bigint));

    if (!bigint) return NULL;

    bigint->sign = sign;
    bigint->word_count = word_count;

    if (allocated_words == -1) allocated_words = word_count;
    bigint->words = (int*) malloc(sizeof(int) * allocated_words);

    if (!bigint->words) {
        free(bigint);
        return NULL;
    }

    return bigint;
}

int* grapheme_bigint_get_words(grapheme_bigint* bigint) {
    return bigint->words;
}

int grapheme_bigint_get_sign(grapheme_bigint* bigint) {
    return bigint->sign;
}

int grapheme_bigint_get_word_count(grapheme_bigint* bigint) {
    return bigint->word_count;
}

void grapheme_free_bigint(grapheme_bigint* bigint) {
    free(bigint->words);
    free(bigint);
}
