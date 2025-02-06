

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

// Code roughly sourced from https://github.com/orgs/community/discussions/81778
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
( async () => {
    const genAI = await new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // Template literal ` ` used to allow multiline prompt
    const prompt = `Tell me a new joke.
    The joke should be two sentences long.
    Each sentence should end with a full stop, question mark or exclamation mark.
    The first sentence should be the setup and the second should be the punchline.
    Limit the entire response to a maximum of 80 words.`;
    const chat = model.startChat({
        history: []
    });
      
    let result = await chat.sendMessage(prompt);
    let text = result.response.text()
    console.log(text);
    document.writeln(text);
    let result2 = await chat.sendMessage(prompt);
     text = result2.response.text()
    console.log(text);
    document.writeln(text);
} )();