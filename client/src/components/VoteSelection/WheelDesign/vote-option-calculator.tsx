export const createVoteOptions = (remainingCredits: number) => {
  // take the squareroot of remianing_credits
  const votes = Math.floor(Math.sqrt(remainingCredits));
  const options = [];
  let index = 0;
  for (let i = votes; i >= -votes; i--) {
    let option = {
      index: index,
      label: i,
      value: i.toString(),
      votes: i,
      cost: i * i,
    };
    options.push(option);
    index++;
  }
  return options;
};
