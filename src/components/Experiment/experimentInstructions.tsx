export function ExperimentInstruction() {
  return (
    <>
      <h3>Introduction to QCS</h3>
      <p>
        For this question, you will use a <b>Quadratic Voting</b> method to express your preferences.
        <br />
        <br />
        Each question gives you a budget of <b>voice credits</b> shown in the progress bar. You will use the available credits to cast votes. You can cast multiple upvotes on an option using <b>+1 sign</b>. You can cast multiple downvotes on an option using <b>-1 sign</b>. If you are neutral on an issue, you can choose to cast <b>no vote</b>.
        <b>
          Based on the number of votes you cast for each option, the cost of the votes are proportional to the square of the number of votes cast for that option.
        </b>
        In other words, <b>X votes will cost X<sup>2</sup> (square of X) credits</b> for that option. The table shows the cost for 1 to 10 votes as an example. You can vote more than 10 votes if the voice credit you have allows so.
        <br />
      </p>
      <br/>
      <table align="center" style={{ borderCollapse: 'collapse', width: '50%' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid lightgrey' }}>
            <th style={{ padding: '0.5em', textAlign: 'left' }}># of up or down votes</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>1</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>2</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>3</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>4</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>5</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>6</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>7</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>8</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>9</th>
            <th style={{ padding: '0.5em', textAlign: 'center' }}>10</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={{ padding: '0.5em', textAlign: 'left' }}>Cost of the Vote</th>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>1</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>4</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>9</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>16</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>25</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>36</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>49</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>64</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>81</td>
            <td style={{ padding: '0.5em', textAlign: 'center', borderTop: '1px solid lightgrey' }}>100</td>
          </tr>
        </tbody>
      </table>

        <p className="instruction">
          <br />
          <b>
            You cannot exceed the budget of given voice credits, but you do not have to use up all the available credits either.{' '}
          </b>
          You can see the total number of voice credits you have and the amount of credits you have spent already in the “Summary” section below.
        </p>
      </>
      );
}