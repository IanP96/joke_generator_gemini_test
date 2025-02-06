

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

// Template literal ` ` used to allow multiline prompt
const JOKE_PROMPT = `Tell me a new joke.
    The joke should be two sentences long.
    Each sentence should end with a full stop, question mark or exclamation mark.
    There should not be any full stops, question marks or exclamation marks anywhere else.
    The first sentence should be the setup and the second should be the punchline.
    Limit the entire response to a maximum of 80 words.`;

const GameStatus = {
    NOT_STARTED: 0,
    JOKE_GIVEN: 1,
    RESULT_GIVEN: 2
};

async function setupChat() {
    const genAI = await new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
        history: []
    });
    return chat;
}

async function getJokeText(chat) {
    const result = await chat.sendMessage(JOKE_PROMPT);
    const jokeText = result.response.text().trim();
    console.log(`Joke received: ${jokeText}`);
    return jokeText;
}

// Only try to access DOM elements once loading complete (avoid null exceptions)
document.addEventListener("DOMContentLoaded", function () {

    const setupPara = document.getElementById("setup-p");
    const punchlineDiv = document.getElementById("punchline-div");
    const jokeBtn = document.getElementById("joke-btn");

    let status = GameStatus.NOT_STARTED;

    function enableBtn(enable) {
        jokeBtn.disabled = !enable;
    }

    async function fillJoke(chat) {
        const jokeText = await getJokeText(chat);
        const sentenceIndex = Math.min(
            ...[".", "?", "!"]
            .map(punc => jokeText.indexOf(punc))
            .filter(index => index !== -1)
        ) + 1;
        const setup = jokeText.substring(0, sentenceIndex);
        console.log(`setup: ${setup}`);
        const punchline = jokeText.substring(sentenceIndex + 1);
        console.log(`punchline: ${punchline}`);
        setupPara.innerHTML = setup;
        punchlineDiv.innerHTML = punchline;
        punchlineDiv.classList.remove("hidden");
    }

    async function jokeBtnClicked(chat) {
        switch (status) {
            case GameStatus.NOT_STARTED:
                enableBtn(false);
                await fillJoke(chat);
                enableBtn(true);
                status = GameStatus.JOKE_GIVEN;
                break;
        
            default:
                // won't be reached
                break;
        }
    }

    ( async () => {
        const chat = await setupChat();
        setupPara.innerHTML = "Click the button below to get started.";
        jokeBtn.addEventListener("click", () => jokeBtnClicked(chat));
    } )();

});