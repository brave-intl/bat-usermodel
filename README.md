# bat-usermodel
BAT Ad User Model

This is a work in progress. Comments welcome, of course.

The Naive Bayes fit uses multinomial distribution with a stopword list.

# Data
The `locales/` directory contains a directory for each locale dataset.
The default list (`locales/default`) uses the standard english language stopword list.

Each dataset consists of two files, `prior.js` and `logPwGc.js`.

The `prior.js` file looks like this:

        module.exports =
        { names:  [ 'class1', ... ]
        , priors: [ lp1,      ... ]
        }

to map each class in `names` to a log probability in `priors`.

The `logPwGc.js` file looks like this:

        module.exports =
        { word1: [ lp1,      ... ]
        , word12
        }

to map each stemmed word to an array of log probabilities corresponding to the classes enumerated in `prior.js`.

You probably want to run

    mkdir -p locales/xx_YY
    uglify --source .../prior.js --output locales/xx_YY/prior.js
    uglify --source .../logPwGc.js --output locales/xx_YY/logPwGc.js

For s better understanding of the text analysis approach,
take a look at the [quanteda](https://docs.quanteda.io/) package.

## Taxonomies
The category space is flat.

A two-level category space may be implemented by using a seperate class for each subcategory.
Subcategories may be mapped to a common supercategory using induction.

# API
The currenbt interface is synchronous.

## Constants

        minimumWordsToClassify
        maximumWordsToClassify

## Locales
A `locales` directory contains one or more directories,
for each `locale`.
At a minimum,
one directory, "default", must be present.

Each directory for a locale has two files:

    prior.js
    logPwGc.js

These are minified files whose `module.exports` contains the objects described above.
For development purposes,
the files do not meed to be minified.
Further,
the corresponding JSON files may be present instead,
i.e.,

    prior.json
    logPwGc.json

To set a specific locale,
use:

    let locale = setLocaleSync('locale', 'directory')

The first argument indicates the particular locale to use, e.g., "en-US".
The second argument indicates the pathname to the locales directory,
and is usually omitted.

Some examples:

    setLocaleSync('en')
    setLocaleSync('en_US')
    setLocaleSync('en_US.UTF-8')

Note that `setLocaleSync` returns the actual locale being used,
e.g., if the locales directory contains "en" but not "en_US",
then `setLocaleSync('en_US')` returns "en".

## Data Files

The call to `setLocaleSYnc` is optional;
however,
it mut be made before either of these two calls is made:

    const prior = getPriorDataSync()
    const matrix = getMatrixDataSync()

## Analysis

        textBlobIntoWordVec
        processWordsFromHTML
        vectorIndexOfMax
        deriveCategoryScores
        NBWordVec

# Future Releaes
Future revisions may add asynchronous calls.

## Log Probabilities
These are encoded as negatibe numbers.
Future revisions may omit the minus-sign.
