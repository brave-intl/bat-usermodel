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
take a look at the [quanteda package](https://docs.quanteda.io/).

## Taxonomies
The category space is flat.

A two-level category space may be implemented by using a seperate class for each subcategory.
Subcategories may be mapped to a common supercategory using induction.

## API



# Future Releaes

## Log Probabilities
These are encoded as negatibe numbers.
Future revisions may omit the minus side.
