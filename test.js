"use strict";
class A {
  constructor() {
    this.hello = "hello";
    setTimeout(() => {
      console.log(a === this); // true
      console.log(a.hello); // hello
      console.log(b); // goodbye
    }, 0);
  }
}
const a = new A();
const b = "goodbye";
