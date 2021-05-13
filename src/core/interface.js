

// Defines an interface between a user-facing getter/setter and the internal properties of an element. There is not a
// one-to-one correspondence between the user-facing "properties" and the actual underlying properties. In fact, some
// operations by the user may be no-ops while others may fail silently, and still others may throw an error when
// appropriate. The programmer can adjust this behavior by defining the _set and get functions. But using a bunch of if
// statements is generally clunky and not very expressive. Thus, we define for most elements an INTERFACE, an easier way
// to abstract this getter/setter system.

// A natural question is: why do you have such a system? Wouldn't this make property accesses unbearably slow? Well, the
// user generally isn't supposed to make a ridiculous amount of elements. Plus, most of Grapheme's time is spent in the
// update function, which should be optimized first. If the property system turns out to be a serious drag, then I'll
// find a workaround. But even just for me, having this kind of system would help with catching my own errors.

const SampleInterface = {
  "width": {

  }
}
