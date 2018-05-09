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

consisting of a vector of class labels denoted by "names" and a vector of prior (log) class probabilities denoted by "priors."
The priors are "document frequencies" aka the probability of a class in the corpus of documents.

The entries in the `names` and `priors` arrays correspond to pairs, e.g.,

        module.exports =
        { names:  [   'red',   blue', 'green' ]
        , priors: ] -1.0988, -1.0981, -1.0987 ]
        }

The `logPwGc.js` file looks like this:

        module.exports =
        { word1: [ lp1,      ... ]
        , word12
        }

This is a set of vectors of multinomial log probabilities of porter-stemmed words given the class.
The class is implied by the  ordering  defined in `prior.js`.
For example,
gien the `priors.js` example above ("red", "blue", and "green"),
each array in `logPwGc.js` will have three values,
with the first value corresponding to "red",
the second value corresponding to "blue",
and the third value corresponding to "green".

You probably want to run

        mkdir -p locales/xx_YY
        uglify --source .../prior.js --output locales/xx_YY/prior.js
        uglify --source .../logPwGc.js --output locales/xx_YY/logPwGc.js

to minify the `prior.js` and `logPwGc.js` files for faster loading.

For s better understanding of the text analysis approach,
take a look at the [quanteda](https://docs.quanteda.io/) package.

## Taxonomies
The class space is flat;
however
a separation character (hyphen, "-") joins the supercategory and subcategory,
e.g., the "sports-rugby" class refers to a supercategory of "sports" with a subcategory of "rugby".

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

## Categories and Subcategories
In release `0.2.x` and earlier,
each class corresponds to a category -- the class taxonomy is flat and fully defined by `prior.js`.

In the current release `0.3.x`, the taxonomy remains flat;
however, a hyphen ("-") is used to join the supercategory and a subcategory into a single class.

Future revisions may use a `taxonomy.js` file to key a category to its subcategories.
