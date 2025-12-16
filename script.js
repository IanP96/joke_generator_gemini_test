import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Words source: https://www.ef-australia.com.au/english-resources/english-vocabulary/top-100-words/
const COMMON_WORDS = `a
about
all
also
and
as
at
be
because
but
by
can
come
could
day
do
even
find
first
for
from
get
give
go
have
he
her
here
him
his
how
I
if
in
into
it
its
just
know
like
look
make
man
many
me
more
my
new
no
not
now
of
on
one
only
or
other
our
out
people
say
see
she
so
some
take
tell
than
that
the
their
them
then
there
these
they
thing
think
this
those
time
to
two
up
us
use
very
want
way
we
well
what
when
which
who
will
with
would
year
you
your`.split("\n");

/** Jokes from non-AI sources to throw in the mix */
let customJokes = [
    // courtesy of an anonymous contributor
    "What do you call a one-eyed dinosaur? A do-you-think-he-saw-us!",
];

/** How often to use custom jokes as a proportion */
const CUSTOM_JOKE_FREQUENCY = 0.01;

const LETTER_REGEX = /([a-z]+)/gi;
const GEMINI_MODEL_NAME = "gemini-2.5-flash-lite";

/**
 * Prompt given to Gemini to generate jokes.
 * Template literal ` ` used to allow multiline prompt
 */
const JOKE_PROMPT = `Tell me a new joke.
    The joke should be two sentences long.
    Each sentence should end with a full stop, question mark or exclamation mark.
    There should not be any full stops, question marks or exclamation marks anywhere else.
    The first sentence should be the setup and the second should be the punchline.
    Limit the entire response to a maximum of 30 words.`;

/** Different states the game can be in at any point in time */
const GameStatus = {
    NOT_STARTED: 0,
    JOKE_GIVEN: 1,
    RESULT_GIVEN: 2,
};

/**
 * Sets up Gemini and starts a new chat with no history
 * @returns a new chat with no history
 */
async function setupChat() {
    const genAI = await new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = await genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
    const chat = model.startChat({
        history: [],
    });
    return chat;
}

/**
 * Ask Gemini for a joke and return it. Alternatively, on occasion, return a custom joke.
 * @param {object} chat the current chat with Gemini
 * @returns {string} the full text of the joke, with leading/trailing whitespace removed
 */
async function getJokeText(chat) {
    let jokeText;
    if (Math.random() < CUSTOM_JOKE_FREQUENCY && customJokes.length) {
        // Use a custom joke
        const index = Math.floor(Math.random() * customJokes.length);
        jokeText = customJokes.splice(index, 1)[0];
        console.log(`Custom joke used: ${jokeText}`);
    } else {
        // Use a joke from Gemini
        const result = await chat.sendMessage(JOKE_PROMPT);
        jokeText = result.response.text().trim();
        console.log(`Joke received from Gemini: ${jokeText}`);
    }
    return jokeText;
}

/**
 * Checks if a character is a letter
 * @param {string} str string to check, single character
 * @returns {boolean} true if letter, false otherwise
 */
function isLetter(str) {
    return str.toLowerCase() !== str.toUpperCase();
}

/**
 * Count number of letters in a string
 * @param {string} str string to check
 * @returns number of letters in str
 */
function numLetters(str) {
    let count = 0;
    for (let char of str) {
        if (isLetter(char)) {
            count++;
        }
    }
    return count;
}

/**
 * Given a punchline, create a list of words that should be hidden with input fields.
 * If no words in the punchline are uncommon, only the longet word will be hidden.
 * If one or more words are uncommon, some portion of those words will be hidden. The portion increases as the player's score increases.
 * @param {string[]} words array of words in the punchline
 * @param {number} score player's current score
 * @returns {string[]} list of words to hide
 */
function getWordsToHide(words, score) {
    const uncommonWords = words.filter(
        (word) => word.match(LETTER_REGEX) && !COMMON_WORDS.includes(word.toLowerCase())
    );
    if (!uncommonWords) {
        // No uncommon words, just return the longest one
        console.log("No uncommon words");
        return [words.reduce((a, b) => (numLetters(a) > numLetters(b) ? a : b), "")];
    }

    // Calculate how many words to add by considering the length of the words and calculating a desired number of letters
    const wordLengths = uncommonWords
        .map((word) => {
            return { length: numLetters(word), word };
        })
        .sort((a, b) => a.length - b.length)
        .reverse();
    console.log(wordLengths);
    /** Total length of all uncommon words */
    const totalLength = wordLengths.reduce((a, b) => a + b.length, 0);
    /** starts at 0.1, tends to 1 as score increases */
    const coeff = -0.9 * 1.1 ** -score + 1;
    const lengthThreshold = totalLength * coeff;
    console.log(`length threshold: ${lengthThreshold} / ${totalLength}`);

    // Populate list of words to hide, starting from longest word, until length threshold is reached
    const wordsToHide = [];
    let totalAdded = 0;
    for (let word of wordLengths) {
        wordsToHide.push(word.word);
        totalAdded += word.length;
        if (totalAdded > lengthThreshold) {
            break;
        }
    }
    return wordsToHide;
}

/**
 * Check if local storage is available by trying to store some test data.
 * Loosely sourced from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
 * @returns {boolean} true if local storage available, false otherwise
 */
function localStorageAvailable() {
    try {
        const testData = "test";
        localStorage.setItem(testData, testData);
        localStorage.removeItem(testData);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * A field where the player inputs a letter to complete the punchline
 */
class InputField {
    /** This field's HTMLElement */
    node;
    /** The correct character that goes in this field (in lowercase) */
    expectedChar;

    constructor(node, expectedChar) {
        this.node = node;
        this.expectedChar = expectedChar.toLowerCase();
    }
}

// Only try to access DOM elements once loading complete (avoid null exceptions)
document.addEventListener("DOMContentLoaded", function () {
    const setupPara = document.getElementById("setup-p");
    const punchlineDiv = document.getElementById("punchline-div");
    const jokeBtn = document.getElementById("joke-btn");
    const scoreDisplay = document.getElementById("score");
    const highScoreDisplay = document.getElementById("high-score");

    let status = GameStatus.NOT_STARTED;
    let inputFields = [];
    let currentPunchline;
    let score = 0;
    const useHighScore = localStorageAvailable();

    /**
     * Set the button's appearance, visibility and focus
     * @param {boolean} visible whether the button should be visible
     * @param {string} title what to set as the title of the button (optional)
     * @param {boolean} focus whether to set focus on the button (optional)
     */
    function setBtn(visible, title, focus) {
        if (visible) {
            jokeBtn.classList.remove("hidden");
        } else {
            jokeBtn.classList.add("hidden");
        }
        if (title !== undefined) {
            jokeBtn.innerHTML = title;
        }
        if (focus) {
            jokeBtn.focus();
        }
    }

    async function fillJoke(chat) {
        setupPara.innerHTML = "Loading the next joke...";
        punchlineDiv.innerHTML = "";
        inputFields = [];
        punchlineDiv.classList.add("hidden");

        const jokeText = await getJokeText(chat);

        // Get the index of the joke string that divides it into setup and punchline
        const sentenceIndex =
            Math.min(
                ...[".", "?", "!"]
                    .map((punc) => jokeText.indexOf(punc))
                    .filter((index) => index !== -1)
            ) + 1;

        const setup = jokeText.substring(0, sentenceIndex);
        console.log(`setup: ${setup}`);
        setupPara.innerHTML = setup;

        // Fill in the punchline and input fields
        const punchline = jokeText.substring(sentenceIndex + 1);
        console.log(`punchline: ${punchline}`);
        const words = punchline.split(LETTER_REGEX);
        const wordsToHide = getWordsToHide(words, score);
        let inputCount = 0;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (wordsToHide.includes(word)) {
                // Fill in first letter of word, then input fields
                let letterFound = false;
                for (let char of word) {
                    if (!isLetter(char)) {
                        punchlineDiv.innerHTML += char;
                        continue;
                    }
                    if (!letterFound) {
                        punchlineDiv.innerHTML += char;
                        letterFound = true;
                        continue;
                    }
                    // Add an input field
                    const field = document.createElement("input");
                    field.type = "text";
                    field.maxLength = 1;
                    field.size = 1;
                    field.id = `input-${inputCount}`;
                    punchlineDiv.appendChild(field);
                    inputCount++;
                    inputFields.push(new InputField(field, char));
                }
            } else {
                punchlineDiv.innerHTML += word;
            }
        }

        // Set focus to the first input field (not working for some reason)
        document.getElementById("input-0").focus();

        // when character is inputted, go to next input field
        for (let i = 0; i < inputCount - 1; i++) {
            const field = document.getElementById(`input-${i}`);
            field.addEventListener("input", () => {
                document.getElementById(`input-${i + 1}`).focus();
            });
        }
        document.getElementById(`input-${inputCount - 1}`).addEventListener("input", () => {
            jokeBtn.focus();
        });

        punchlineDiv.classList.remove("hidden");
        currentPunchline = punchline;
    }

    /**
     * Set the score and high score labels based on the current score e.g. "Score: 0". Update value of highScore in local storage if needed.
     */
    function updateScore() {
        scoreDisplay.innerHTML = `Current streak: ${score}`;
        if (useHighScore) {
            const prevHighScore = Number(localStorage.getItem("highScore"));
            let newHighScore;
            if (score > prevHighScore) {
                newHighScore = score;
                localStorage.setItem("highScore", newHighScore);
            } else {
                newHighScore = prevHighScore;
            }
            highScoreDisplay.innerHTML = ` | Highest streak: ${newHighScore}`;
        }
    }

    /**
     * Check the player's answer.
     * If correct, add 1 to the score and display it. Colour all fields green.
     * If incorrect, show the correct answer and show fields with an incorrect answer in red.
     */
    function verifyAnswer() {
        let allCorrect = true;
        for (let i = 0; i < inputFields.length; i++) {
            const input = document.getElementById(`input-${i}`);
            const correct = input.value.toLowerCase() === inputFields[i].expectedChar;
            let inputFieldColour;
            if (correct) {
                inputFieldColour = "green";
            } else {
                inputFieldColour = "red";
                allCorrect = false;
            }
            input.style.borderColor = inputFieldColour;
        }
        console.log(`Answer correct: ${allCorrect}`);
        if (allCorrect) {
            score++;
            updateScore();
        } else {
            score = 0;
            updateScore();
            alert(`🙁 Incorrect, the punchline was:\n${currentPunchline}`);
        }
    }

    /**
     * To be called when the button is clicked.
     * If the game hasn't started or an answer has already been checked, fill in a new joke.
     * If a joke has been given, check the answer.
     * @param {object} chat the current chat with Gemini
     */
    async function jokeBtnClicked(chat) {
        switch (status) {
            case GameStatus.NOT_STARTED:
            case GameStatus.RESULT_GIVEN:
                setBtn(false);
                await fillJoke(chat);
                status = GameStatus.JOKE_GIVEN;
                setBtn(true, "Submit guess");
                break;

            case GameStatus.JOKE_GIVEN:
                verifyAnswer();

                status = GameStatus.RESULT_GIVEN;
                setBtn(true, "Next joke", true);
                break;

            default:
                // shouldn't be reached
                break;
        }
    }

    // Code to be ran initially. Needs an async as we need to wait for the chat to be set up
    (async () => {
        setBtn(false);
        console.log(`Local storage available: ${useHighScore}`);
        updateScore();
        const chat = await setupChat();
        setBtn(true, "Generate joke", true);
        setupPara.innerHTML = "Click the button below to get started.";
        jokeBtn.addEventListener("click", () => jokeBtnClicked(chat));
    })();
});
