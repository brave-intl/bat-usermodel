# H1 NB
    The Naive Bayes fit is done assuming multinomial distribution with the standard english language stopword list.
    A documented example exists in the [quanteda package](https://docs.quanteda.io/). I can also provide R code.

    All numeric data is encoded as log  probabilities.

    Log probabilities have 5 significant digits, aka -9.1166, -11.531

    We probably SHOULD remove the - sign from all the log probabilities (since they are all negative) to save a bit of space, but at
    present, it needs to be there.
    
    All taxonomies with subcategories need to be fit as if the category were a separate unrelated class from subcategories. Aka
    if we have something like "sports" as a category, and "football" "softball" as subcategories, the fit should be on
    "sports" "football" "softball" all as different classes. The "supercategory" fit can be done  by induction. There will be no
    sub-sub-categories; taxonomies can only be 2 deep.

    New json files should be kept in ./data

# H1 JSON files
    I'm listing the described JSON files as their original file names.
    For new JSON files in different languages, or different taxonomies, they should be labeled as such.
    For example, for the original file prior.json, a new taxonomy (v2) and in French, we'd call this file prior-tv2-french.json.
    There would be a corresponding logPwGc-tv2-french.json file. If the taxonomy were heirarchical, there would also be a file
    called taxonomy-tv2.json

# H2    prior.json
     This is a json structure consisting of a vector of class labels denoted by "names" and a vector of prior (log) class probabilities
     denoted by "priors."  
     The priors are "document frequencies" aka the probability of a class in the corpus of documents. This vector of log probabilities
     is presently not actually used in the calculation, and is of lesser importance. Of primary importance is the presence of the class
     labels as an ordered list. This is used in defining the actual classname in the NB code.
     
# H2   logPwGc.json
   This is a set of vectors of multinomial log probabilities of a porter stemmed words given the class. The class is implied by the
   ordering  defined in  prior.json. Aka if prior.json has a list of 3 classes a la
   {"names": ["red", "blue", "green"], priors: [-1.0988,-1.0981,-1.0987]}
   It is to be understood that the first log probability in the list corresponds to class "red" the second, "blue" etc.
   All words, regardless of language, will be porter stemmed.

# H2 taxonomy.json
    The original class taxonomy was a flat taxonomy. It was fully defined by prior.json.
    Taxonomies with subcategories need to encode this in taxonomy.json.
    The vectors of subcategories will be keyed by catogory aka..
    { "category": ["subcat1", "subcat2", ....] ...
    