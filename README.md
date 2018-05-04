# bat-usermodel
BAT Ad User Model

This is a work in progress. Comments welcome, of course.

The Naive Bayes fit uses multinomial distribution with a stopword list.

The resulting data files are all log probabilities with 5 significant digits.

# Data
The `locales/` directory contains a directory for each locale dataset.
The default list (`locales/default`) uses the standard english language stopword list.

Each dataset consists of two files, `prior.js` and `logPwGc.js`.

The `prior.js` file looks like this:

        module.exports =
        { names:  [ 'class1', ... ]
        , priors: [ lp1,      ... ]
        }

consisting of a vector of class labels denoted by "names" and a vector of
    prior (log) class probabilities denoted by "priors."  
    The priors are "document frequencies" aka the probability of a class in the corpus of documents.
    

The `logPwGc.js` file looks like this:

        module.exports =
        { word1: [ lp1,      ... ]
        , word12
        }

    This is a set of vectors of multinomial log probabilities of porter stemmed words given the class.
    The class is implied by the  ordering  defined in  prior.json. Aka if prior.json has a list of 3 classes a la
    {"names": ["red", "blue", "green"], priors: [-1.0988,-1.0981,-1.0987]}
    It is to be understood that the first log probability in the list corresponds to class "red" the second,
    "blue" etc.   All words, regardless of language, will be porter stemmed.

You probably want to run

    mkdir -p locales/xx_YY
    uglify --source .../prior.js --output locales/xx_YY/prior.js
    uglify --source .../logPwGc.js --output locales/xx_YY/logPwGc.js

For s better understanding of the text analysis approach,
take a look at the [quanteda](https://docs.quanteda.io/) package.

## Taxonomies
The category space is flat.

A two-level category space may be implemented by using a seperate class for each subcategory.

Subcategories may be mapped to a common supercategory using a taxonomy json/locale file, which maps categories
to subcategories.

   The original class taxonomy was a flat taxonomy. It was fully defined by prior.json.
   Taxonomies with subcategories need to encode this in taxonomy.json.
   The vectors of subcategories will be keyed by catogory aka..
   { "category": ["subcat1", "subcat2", ....] ...



# API
The current interface is synchronous.

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
These are encoded as negative numbers.
Future revisions may omit the minus-sign.
